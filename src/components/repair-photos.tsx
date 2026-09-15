import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';

import { userMessage } from '../api/errors';
import type { Attachment } from '../api/types';
import { useSession } from '../auth/session';
import { attachmentsPath, useAttachments, useUploadAttachment } from '../features/shared/queries';
import { MAX_PHOTOS_PER_REQUEST, pickPhoto, type PreparedPhoto } from '../lib/photos';
import { buildUrl } from '../api/client';
import { Button, Notice, Row, Text } from '../ui/primitives';
import { useTheme } from '../ui/theme';

/**
 * Photos on a repair request. Images are private: each is fetched from the API
 * with the session's bearer token, never from a public URL, and nothing is
 * written to a shared cache.
 */
export function RepairPhotos({
  experience,
  requestId,
  canAdd,
}: {
  experience: 'renter' | 'landlord';
  requestId: string;
  canAdd: boolean;
}) {
  const t = useTheme();
  const list = useAttachments(experience, requestId);
  const upload = useUploadAttachment(experience, requestId);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState<PreparedPhoto | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<Attachment | null>(null);

  const photos = list.data ?? [];
  const full = photos.length >= MAX_PHOTOS_PER_REQUEST;

  async function send(photo: PreparedPhoto) {
    setFailed(null);
    setProgress(0);
    try {
      await upload.mutateAsync({ photo, onProgress: setProgress });
    } catch {
      setFailed(photo); // keep it so the person can retry without re-taking it
    } finally {
      setProgress(null);
    }
  }

  async function add(source: 'camera' | 'library') {
    setNote(null);
    const result = await pickPhoto(source);
    if (result.status === 'denied') setNote(result.reason);
    if (result.status === 'picked') await send(result.photo);
  }

  return (
    <View style={{ gap: t.space(2) }}>
      <Text variant="bodyStrong">Photos</Text>
      {list.isPending ? (
        <ActivityIndicator color={t.color.primary} />
      ) : list.isError ? (
        <Notice tone="danger">{userMessage(list.error)}</Notice>
      ) : photos.length === 0 ? (
        <Text muted>No photos yet.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space(2) }}>
          {photos.map((p) => (
            <Pressable key={p.id} onPress={() => setOpen(p)} accessibilityRole="imagebutton" accessibilityLabel="Open photo">
              <PrivateImage experience={experience} requestId={requestId} attachmentId={p.id ?? ''} size={96} />
            </Pressable>
          ))}
        </View>
      )}

      {progress !== null ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 4 }}>
          <Text muted variant="caption">{`Uploading… ${Math.round(progress * 100)}%`}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.color.surfaceMuted }}>
            <View style={{ height: 6, borderRadius: 3, width: `${Math.round(progress * 100)}%`, backgroundColor: t.color.primary }} />
          </View>
        </View>
      ) : null}

      {failed ? (
        <Notice tone="danger">
          {`That photo didn't upload. ${userMessage(upload.error)}`}
        </Notice>
      ) : null}
      {failed ? <Button label="Retry photo" kind="secondary" onPress={() => void send(failed)} /> : null}
      {note ? <Notice tone="warning">{note}</Notice> : null}

      {canAdd && !full && progress === null ? (
        <Row>
          <Button label="Take photo" kind="secondary" onPress={() => void add('camera')} style={{ flex: 1 }} />
          <Button label="Choose photo" kind="secondary" onPress={() => void add('library')} style={{ flex: 1 }} />
        </Row>
      ) : null}
      {canAdd && full ? <Text muted variant="caption">{`A request can have up to ${MAX_PHOTOS_PER_REQUEST} photos.`}</Text> : null}

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setOpen(null)}
          accessibilityLabel="Close photo"
        >
          {open ? <PrivateImage experience={experience} requestId={requestId} attachmentId={open.id ?? ''} size="full" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function PrivateImage({
  experience,
  requestId,
  attachmentId,
  size,
}: {
  experience: 'renter' | 'landlord';
  requestId: string;
  attachmentId: string;
  size: number | 'full';
}) {
  const { api } = useSession();
  const t = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api.token().then((tk) => active && setToken(tk)).catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [api, attachmentId]);

  const style =
    size === 'full'
      ? { width: '100%' as const, height: '80%' as const }
      : { width: size, height: size, borderRadius: t.radius.md, backgroundColor: t.color.surfaceMuted };

  if (failed) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text muted variant="caption">Unavailable</Text>
      </View>
    );
  }
  if (!token) {
    return (
      <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={t.color.primary} />
      </View>
    );
  }
  return (
    <Image
      source={{
        uri: buildUrl(`${attachmentsPath(experience, requestId)}/${encodeURIComponent(attachmentId)}/content`),
        headers: { Authorization: `Bearer ${token}` },
        cache: 'reload',
      }}
      resizeMode={size === 'full' ? 'contain' : 'cover'}
      onError={() => setFailed(true)}
      style={style}
      accessibilityIgnoresInvertColors
    />
  );
}
