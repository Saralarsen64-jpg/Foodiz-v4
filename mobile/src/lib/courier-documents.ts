import { foodizApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type CourierDocumentType =
  | 'identity_front'
  | 'identity_back'
  | 'activity_proof';

export type CourierDocument = {
  id: string;
  document_type: CourierDocumentType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PickedCourierDocument = {
  uri: string;
  name: string;
  mimeType: string;
};

export const courierDocumentLabels: Record<CourierDocumentType, string> = {
  identity_front: 'Pièce d’identité — recto',
  identity_back: 'Pièce d’identité — verso',
  activity_proof: 'Justificatif officiel d’activité',
};

export async function loadCourierDocuments() {
  return foodizApi<{ documents: CourierDocument[] }>('courier-documents');
}

export async function uploadCourierDocument(
  documentType: CourierDocumentType,
  document: PickedCourierDocument,
) {
  const fileResponse = await fetch(document.uri);
  if (!fileResponse.ok) {
    throw new Error('Le fichier sélectionné ne peut pas être lu.');
  }
  const body = await fileResponse.arrayBuffer();
  if (body.byteLength <= 0 || body.byteLength > 8 * 1024 * 1024) {
    throw new Error('Le justificatif doit peser moins de 8 Mo.');
  }

  const prepared = await foodizApi<{ path: string; token: string }>(
    'courier-documents',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'prepare',
        documentType,
        fileName: document.name,
        mimeType: document.mimeType,
        sizeBytes: body.byteLength,
      }),
    },
  );

  const { error } = await supabase.storage
    .from('courier-documents')
    .uploadToSignedUrl(prepared.path, prepared.token, body, {
      contentType: document.mimeType,
      upsert: false,
    });
  if (error) throw error;

  return foodizApi<{
    submitted: boolean;
    complete: boolean;
    message: string;
  }>('courier-documents', {
    method: 'POST',
    body: JSON.stringify({
      action: 'complete',
      documents: [
        {
          documentType,
          storagePath: prepared.path,
          originalName: document.name,
          mimeType: document.mimeType,
          sizeBytes: body.byteLength,
        },
      ],
    }),
  });
}
