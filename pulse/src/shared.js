import { createClient } from '@supabase/supabase-js';

const config = window.PULSE_CONFIG;
const client = config?.url && config?.key
  ? createClient(config.url, config.key, { auth: { persistSession: true, detectSessionInUrl: false } })
  : null;
let userId = null;
const savedFrames = new Map();

async function momentsWithFrames(){
  const moments=await rows('pulse_moments',null,'id,actor,clip,name,description,frame_time,created_at');
  const missing=moments.filter(row=>!savedFrames.has(row.id));
  for(let start=0;start<missing.length;start+=25){
    const ids=missing.slice(start,start+25).map(row=>row.id);
    const {data,error}=await client.from('pulse_moments').select('id,frame').in('id',ids);
    if(error)throw error;
    for(const row of data)savedFrames.set(row.id,row.frame);
  }
  return moments.map(row=>({...row,frame:savedFrames.get(row.id)}));
}


async function rows(table, filter, columns="*") {
  const result = [];
  const pageSize = 250;
  let cursor;
  for (;;) {
    let query = client.from(table).select(columns).order('id').limit(pageSize);
    if (filter) query = query.eq(filter[0],filter[1]);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...data);
    if (data.length < pageSize) return result;
    cursor = data.at(-1).id;
  }
}

async function rpc(name, params) {
  const { error } = await client.rpc(name, params);
  if (error) throw error;
}

export const shared = client && {
  get userId() { return userId; },
  async login(message, signature) {
    const { data, error } = await client.auth.signInWithWeb3({ chain: 'ethereum', message, signature });
    if (error) throw error;
    userId = data.user.id;
  },
  logout() {
    userId = null;
    return client.auth.signOut({ scope: 'local' });
  },
  async restore(address) {
    const {data:{session}} = await client.auth.getSession();
    if (!session) return false;
    const {data:{user}, error} = await client.auth.getUser();
    if (error || !/^0x[0-9a-f]{40}$/i.test(address)) return false;
    const providerId = 'web3:ethereum:' + address.toLowerCase();
    const matchesWallet = user?.identities?.some(identity =>
      identity.provider === 'web3' &&
      [identity.id, identity.identity_data?.sub].some(id => typeof id === 'string' && id.toLowerCase() === providerId)
    );
    if (!matchesWallet) return false;
    userId=user.id;
    return true;
  },
  async community() {
    const [moments, comments, reactions, messages] = await Promise.all([
      momentsWithFrames(), rows('pulse_comments'), rows('pulse_reactions'),
      userId ? rows('pulse_messages') : []
    ]);
    return {moments, comments, reactions, messages};
  },
  async post(table, values) {
    const {error} = await client.from('pulse_'+table).insert(values);
    if(error && error.code!=='23505') throw error;
  },
  async react(kind,target,on) {
    if(on) return this.post('reactions',{kind,target});
    const {error}=await client.from('pulse_reactions').delete().match({actor:userId,kind,target});
    if(error) throw error;
  },
  async profile(id) {
    const [creators,videos]=await Promise.all([rows('pulse_creators',['id',id]),rows('pulse_videos',['creator_id',id])]);
    return {creators,videos:videos.sort((a,b)=>b.created_at.localeCompare(a.created_at))};
  },
  async feed() {
    const [videos,creators]=await Promise.all([rows('pulse_videos'),rows('pulse_creators')]);
    return { creators, videos: videos.sort((a,b) => b.created_at.localeCompare(a.created_at)) };
  },
  async recordView(videoId, playbackId) {
    const { data, error } = await client.rpc('pulse_record_video_view', { target_video: videoId, playback: playbackId });
    if (error) throw error;
    return data;
  },
  avatar(row) {
    if (!row.avatar_updated_at) return '';
    const { data } = client.storage.from('pulse-avatars').getPublicUrl(row.id + '/avatar.jpg');
    return data.publicUrl + '?v=' + encodeURIComponent(row.avatar_updated_at);
  },
  async setAvatar(file) {
    const owner = userId;
    if (!owner) throw Error('Sign in to change your profile photo.');
    const { error } = await client.storage.from('pulse-avatars').upload(owner + '/avatar.jpg', file, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '0'
    });
    if (error) throw error;
    if (owner !== userId) throw Error('Wallet changed. Sign in again.');
    await rpc('pulse_set_profile_photo');
  },
  media(row) {
    return client.storage.from('pulse-videos').getPublicUrl(row.creator_id + '/' + row.id).data.publicUrl;
  },
  create: name => rpc('pulse_create_channel', { display_name: name }),
  claim: symbol => rpc('pulse_claim_ticker', { symbol }),
  async publish(file, title, id, captions, onPublished) {
    if (!['video/mp4','video/webm','video/quicktime'].includes(file.type) || file.size > 50 * 1024 * 1024)
      throw Error('Choose an MP4, WebM or MOV file up to 50 MiB.');
    const owner = userId;
    const {data:{session}}=await client.auth.getSession();
    if(!session||owner!==userId)throw Error('Sign in again to publish.');
    const error=await new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST',config.url+'/storage/v1/object/pulse-videos/'+owner+'/'+id);
      xhr.setRequestHeader('Authorization','Bearer '+session.access_token);
      xhr.setRequestHeader('apikey',config.key);
      xhr.setRequestHeader('Content-Type',file.type);
      xhr.upload.onprogress=e=>{if(e.lengthComputable)onPublished?.(Math.min(99,Math.round(e.loaded/e.total*100)));};
      xhr.onload=()=>resolve(xhr.status>=200&&xhr.status<300?null:Error('Video upload failed ('+xhr.status+').'));
      xhr.onerror=()=>reject(Error('Network interrupted. Retry this upload.'));
      xhr.send(file);
    });
    if(owner!==userId)throw Error('Wallet changed. Sign in again.');
    onPublished?.(100);
    // A retry can find the file from an earlier attempt. The RPC verifies it exists.
    try {
      const params={video_id:id, video_title:title};
      if(captions) await rpc('pulse_publish_captioned_video',{...params,subtitles:captions});
      else await rpc('pulse_publish_video',params);
    } catch (publishError) {
      throw error || publishError;
    }
  }
};
