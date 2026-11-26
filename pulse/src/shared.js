import { createClient } from '@supabase/supabase-js';

const config = window.PULSE_CONFIG;
const client = config?.url && config?.key
  ? createClient(config.url, config.key, { auth: { persistSession: false, detectSessionInUrl: false } })
  : null;
let userId = null;

async function rows(table) {
  const result = [];
  const pageSize = 250;
  let cursor;
  for (;;) {
    let query = client.from(table).select('*').order('id').limit(pageSize);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...data);
    if (!data.length) return result;
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
  async feed() {
    const videos = await rows('pulse_videos');
    const creators = await rows('pulse_creators');
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
  async publish(file, title, id) {
    if (!['video/mp4','video/webm','video/quicktime'].includes(file.type) || file.size > 50 * 1024 * 1024)
      throw Error('Choose an MP4, WebM or MOV file up to 50 MiB.');
    const owner = userId;
    const { error } = await client.storage.from('pulse-videos').upload(owner + '/' + id, file, { upsert: false });
    if (owner !== userId) throw Error('Wallet changed. Sign in again.');
    // A retry can find the file from an earlier attempt. The RPC verifies it exists.
    try {
      await rpc('pulse_publish_video', { video_id: id, video_title: title });
    } catch (publishError) {
      throw error || publishError;
    }
  }
};
