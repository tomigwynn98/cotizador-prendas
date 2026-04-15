import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase, getUser } from './supabase';

const BUCKET = 'cotizacion-fotos';

/** Abre picker (camara o galeria) y devuelve el asset */
export async function pickPhoto(source: 'camera' | 'library'): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled) return null;
    return result.assets[0];
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled) return null;
    return result.assets[0];
  }
}

/** Sube la foto a Supabase Storage y devuelve la URL publica */
export async function uploadPhoto(asset: ImagePicker.ImagePickerAsset, cotizacionId: string): Promise<string | null> {
  try {
    const user = await getUser();
    if (!user) return null;

    const path = `${user.id}/${cotizacionId}.jpg`;

    let fileData: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const res = await fetch(asset.uri);
      fileData = await res.blob();
    } else {
      const res = await fetch(asset.uri);
      fileData = await res.arrayBuffer();
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, fileData as any, {
      contentType: 'image/jpeg',
      upsert: true,
    });

    if (error) { console.error('uploadPhoto error:', error); return null; }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Add cache-busting query param
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (e) {
    console.error('uploadPhoto exception:', e);
    return null;
  }
}

/** Update cotizacion with photo URL */
export async function updateCotizacionFoto(cotizacionId: string, fotoUrl: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  // Update data JSONB + foto_url column
  const { data: existing } = await supabase.from('cotizaciones')
    .select('data').filter('data->>id', 'eq', cotizacionId).single();

  if (existing) {
    const newData = { ...(existing.data as any), fotoUrl };
    await supabase.from('cotizaciones').update({ data: newData, foto_url: fotoUrl })
      .filter('data->>id', 'eq', cotizacionId);
  }
}
