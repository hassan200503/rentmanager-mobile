import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/**
 * Photos for repair requests: pick or take one, then shrink it on the device
 * before it ever touches the network. A phone camera produces 3–12 MB; a
 * repair photo needs ~1600 px on the long edge, which is 200–600 KB as JPEG.
 * That is the difference between an upload that finishes on a weak 3G signal
 * outside a building and one that does not.
 *
 * Permissions are requested at the moment of use, never at launch, and a
 * refusal returns a clear reason instead of throwing.
 */

export interface PreparedPhoto {
  uri: string;
  name: string;
  type: 'image/jpeg';
  width: number;
  height: number;
}

export type PickResult =
  | { status: 'picked'; photo: PreparedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied'; reason: string };

const MAX_EDGE = 1600;
const QUALITY = 0.7;
/** Matches the backend limit (MaintenanceAttachmentService.MAX_PER_REQUEST). */
export const MAX_PHOTOS_PER_REQUEST = 5;

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      status: 'denied',
      reason:
        source === 'camera'
          ? 'Camera access is off for RentManager. You can turn it on in your phone settings.'
          : 'Photo access is off for RentManager. You can turn it on in your phone settings.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false, // never read or keep location metadata
  };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) {
    return { status: 'cancelled' };
  }
  return { status: 'picked', photo: await preparePhoto(result.assets[0].uri, result.assets[0].width, result.assets[0].height) };
}

/** Resizes to at most MAX_EDGE on the long side and re-encodes as JPEG, dropping EXIF. */
export async function preparePhoto(uri: string, width: number, height: number): Promise<PreparedPhoto> {
  const resize =
    Math.max(width, height) > MAX_EDGE
      ? width >= height
        ? { width: MAX_EDGE }
        : { height: MAX_EDGE }
      : null;
  const output = await ImageManipulator.manipulateAsync(uri, resize ? [{ resize }] : [], {
    compress: QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return {
    uri: output.uri,
    name: `repair-${Date.now()}.jpg`,
    type: 'image/jpeg',
    width: output.width,
    height: output.height,
  };
}
