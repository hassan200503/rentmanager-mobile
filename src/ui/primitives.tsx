import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme, type Theme } from './theme';

// ─── Text ────────────────────────────────────────────────────────────────────

type Variant = keyof Theme['font'];

export function Text({
  variant = 'body',
  muted,
  tone,
  style,
  children,
  ...rest
}: React.ComponentProps<typeof RNText> & {
  variant?: Variant;
  muted?: boolean;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
}) {
  const t = useTheme();
  const color = tone ? t.color[tone] : muted ? t.color.textMuted : t.color.text;
  // allowFontScaling stays on (the default): Dynamic Type / font size
  // settings must scale every label.
  return (
    <RNText style={[t.font[variant], { color }, style]} maxFontSizeMultiplier={2} {...rest}>
      {children}
    </RNText>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const padding = { padding: t.space(4), gap: t.space(4) };
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.color.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.color.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const cardStyle = {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.border,
    padding: t.space(4),
    gap: t.space(2),
  };
  if (!onPress) {
    return <View style={[cardStyle, style]}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.85 : 1, minHeight: t.touchTarget }, style]}
    >
      {children}
    </Pressable>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  accessibilityHint,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const inactive = disabled || loading;
  const bg =
    kind === 'primary' ? t.color.primary : kind === 'danger' ? t.color.danger : kind === 'secondary' ? t.color.surface : 'transparent';
  const fg =
    kind === 'primary' ? t.color.onPrimary : kind === 'danger' ? t.color.textInverse : t.color.primary;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: t.touchTarget,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space(4),
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.space(2),
          backgroundColor: bg,
          borderWidth: kind === 'secondary' ? 1 : 0,
          borderColor: t.color.border,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <RNText style={[t.font.bodyStrong, { color: fg }]} maxFontSizeMultiplier={1.6}>
        {label}
      </RNText>
    </Pressable>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = useTheme();
  const fg = tone === 'neutral' ? t.color.textMuted : t.color[tone];
  const bg = tone === 'neutral' ? t.color.surfaceMuted : t.color[`${tone}Bg` as const];
  return (
    <View
      style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: t.radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}
      accessible
      accessibilityLabel={label}
    >
      <RNText style={[t.font.caption, { color: fg, fontWeight: '600' }]} maxFontSizeMultiplier={1.6}>
        {label}
      </RNText>
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.space(3), paddingVertical: t.space(1) }}>
      <Text muted style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: t.space(10), alignItems: 'center', gap: t.space(3) }} accessibilityLiveRegion="polite">
      <ActivityIndicator color={t.color.primary} accessibilityLabel={label} />
      <Text muted>{label}…</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: 'center', paddingVertical: t.space(8) }}>
      <Text variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: 'center' }}>
        {body}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: t.space(2) }} /> : null}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ backgroundColor: t.color.dangerBg, borderColor: t.color.dangerBg }}>
      <Text tone="danger" variant="bodyStrong" accessibilityRole="alert">
        {message}
      </Text>
      {onRetry ? <Button label="Try again" kind="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function Notice({ tone, children }: { tone: Exclude<Tone, 'neutral'>; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.color[`${tone}Bg` as const], borderRadius: t.radius.md, padding: t.space(3) }}>
      <Text tone={tone}>{children}</Text>
    </View>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────

export function Field({
  label,
  error,
  hint,
  style,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space(1) }}>
      <Text variant="bodyStrong" nativeID={`label-${label}`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        aria-labelledby={`label-${label}`}
        placeholderTextColor={t.color.textMuted}
        style={[
          t.font.body,
          {
            minHeight: t.touchTarget,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: error ? t.color.danger : t.color.border,
            backgroundColor: t.color.surface,
            color: t.color.text,
            paddingHorizontal: t.space(3),
            paddingVertical: t.space(2),
          },
          style,
        ]}
        {...input}
      />
      {error ? (
        <Text tone="danger" variant="caption" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text muted variant="caption">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Choice chips ────────────────────────────────────────────────────────────

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space(2) }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="bodyStrong">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space(2) }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={{
                minHeight: 40,
                minWidth: 44,
                justifyContent: 'center',
                paddingHorizontal: t.space(3),
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: selected ? t.color.primary : t.color.border,
                backgroundColor: selected ? t.color.primary : t.color.surface,
              }}
            >
              <RNText style={[t.font.body, { color: selected ? t.color.onPrimary : t.color.text }]} maxFontSizeMultiplier={1.6}>
                {o.label}
              </RNText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
      <Text variant="heading" accessibilityRole="header">
        {children}
      </Text>
      {action}
    </Row>
  );
}

// ─── Sheet ───────────────────────────────────────────────────────────────────

/**
 * Bottom sheet for a short confirmation form. Keeps the focused field and the
 * submit button above the keyboard, closes on the hardware back button, and
 * refuses to close while `busy` so a submission cannot be abandoned mid-flight.
 */
export function Sheet({
  visible,
  title,
  onClose,
  busy,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const close = () => {
    if (!busy) onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={close}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: t.color.surface,
            borderTopLeftRadius: t.radius.lg,
            borderTopRightRadius: t.radius.lg,
            maxHeight: '90%',
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: t.space(4), gap: t.space(3), paddingBottom: t.space(8) }}>
            <Text variant="heading" accessibilityRole="header">
              {title}
            </Text>
            {children}
            <Button label="Cancel" kind="ghost" onPress={close} disabled={busy} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
