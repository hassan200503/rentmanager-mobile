import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { userMessage } from '../../src/api/errors';
import type { MaintenanceCategory, MaintenancePriority } from '../../src/api/types';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '../../src/components/maintenance-badges';
import { useSession } from '../../src/auth/session';
import { useSubmitMaintenance } from '../../src/features/renter/queries';
import { attachmentsPath } from '../../src/features/shared/queries';
import { MAX_PHOTOS_PER_REQUEST, pickPhoto, type PreparedPhoto } from '../../src/lib/photos';
import { track } from '../../src/observability/analytics';
import { Button, Card, ChoiceChips, Field, Notice, Row, Screen, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MaintenanceCategory[];
const PRIORITIES = Object.keys(PRIORITY_LABEL) as MaintenancePriority[];

/**
 * Report a repair. The backend attaches the unit, property and lease from the
 * signed-in renter's current lease — the client sends none of them.
 *
 * Photos are optional. They are compressed on the phone, then uploaded one by
 * one after the request exists, so a failed photo never loses the report. If
 * submission itself fails, everything typed and picked stays on screen.
 */
export default function ReportIssue() {
  const t = useTheme();
  const { api } = useSession();
  const submit = useSubmitMaintenance();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [errors, setErrors] = useState<{ title?: string; category?: string }>({});
  const [note, setNote] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ index: number; progress: number } | null>(null);

  async function addPhoto(source: 'camera' | 'library') {
    setNote(null);
    const result = await pickPhoto(source);
    if (result.status === 'denied') setNote(result.reason);
    if (result.status === 'picked') setPhotos((p) => [...p, result.photo].slice(0, MAX_PHOTOS_PER_REQUEST));
  }

  async function uploadAll(requestId: string): Promise<number> {
    let failed = 0;
    for (let i = 0; i < photos.length; i++) {
      setUploading({ index: i, progress: 0 });
      try {
        await api.upload(attachmentsPath('renter', requestId), photos[i], (f) => setUploading({ index: i, progress: f }));
      } catch {
        failed++;
      }
    }
    setUploading(null);
    return failed;
  }

  function send() {
    if (submit.isPending || uploading) return;
    const next: typeof errors = {};
    if (title.trim().length < 3) next.title = 'Say briefly what is wrong (at least 3 characters).';
    if (!category) next.category = 'Choose the closest category.';
    setErrors(next);
    if (Object.keys(next).length || !category) return;

    submit.mutate(
      { title: title.trim(), description: description.trim() || undefined, category, priority },
      {
        onSuccess: async (created) => {
          track('maintenance_request_created');
          const id = created.id ?? '';
          const failed = photos.length && id ? await uploadAll(id) : 0;
          // The detail screen explains any photo that didn't make it.
          router.replace(id ? `/(renter)/request/${id}?photosFailed=${failed}` : '/(renter)/maintenance');
        },
      },
    );
  }

  const busy = submit.isPending || !!uploading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text variant="title" accessibilityRole="header">
          Report an issue
        </Text>
        <Card>
          <Field
            label="What's wrong?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Kitchen tap is leaking"
            error={errors.title}
            maxLength={120}
            returnKeyType="next"
            editable={!busy}
          />
          <ChoiceChips
            label="Category"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
          />
          {errors.category ? <Text tone="danger" variant="caption">{errors.category}</Text> : null}
          <ChoiceChips
            label="How urgent is it?"
            value={priority}
            onChange={setPriority}
            options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          />
          {priority === 'URGENT' ? (
            <Notice tone="warning">For a fire, gas leak or anything dangerous, call emergency services first.</Notice>
          ) : null}
          <Field
            label="Details (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Where exactly, since when, anything you've tried"
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
            maxLength={2000}
            editable={!busy}
          />

          <Text variant="bodyStrong">Photos (optional)</Text>
          {photos.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space(2) }}>
              {photos.map((p, i) => (
                <View key={p.uri} style={{ gap: 4 }}>
                  <Image source={{ uri: p.uri }} style={{ width: 88, height: 88, borderRadius: t.radius.md }} accessibilityLabel={`Photo ${i + 1}`} />
                  {uploading?.index === i ? (
                    <Text variant="caption" muted>{`${Math.round(uploading.progress * 100)}%`}</Text>
                  ) : !busy ? (
                    <Pressable
                      onPress={() => setPhotos((all) => all.filter((x) => x.uri !== p.uri))}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${i + 1}`}
                      style={{ minHeight: 32, justifyContent: 'center' }}
                    >
                      <Text variant="caption" tone="danger">Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text muted variant="caption">A photo often explains the problem faster than words.</Text>
          )}
          {photos.length < MAX_PHOTOS_PER_REQUEST && !busy ? (
            <Row>
              <Button label="Take photo" kind="secondary" onPress={() => void addPhoto('camera')} style={{ flex: 1 }} />
              <Button label="Choose photo" kind="secondary" onPress={() => void addPhoto('library')} style={{ flex: 1 }} />
            </Row>
          ) : null}

          {note ? <Notice tone="warning">{note}</Notice> : null}
          {submit.isError ? <Notice tone="danger">{userMessage(submit.error)}</Notice> : null}
          <Button
            label={uploading ? `Uploading photo ${uploading.index + 1} of ${photos.length}…` : 'Send to landlord'}
            onPress={send}
            loading={busy}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
