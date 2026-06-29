import { foodizApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type PartnerDocumentType =
  | 'registration_proof'
  | 'liability_insurance'
  | 'hygiene_training'
  | 'sanitary_declaration'
  | 'alcohol_license';

export type PartnerDocument = {
  id: string;
  document_type: PartnerDocumentType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const partnerDocumentLabels: Record<PartnerDocumentType, string> = {
  registration_proof: 'Justificatif officiel d’immatriculation',
  liability_insurance: 'Responsabilité civile professionnelle',
  hygiene_training: 'Formation hygiène alimentaire / HACCP',
  sanitary_declaration: 'Déclaration sanitaire applicable',
  alcohol_license: 'Licence de vente d’alcool',
};

export async function loadPartnerDocuments() {
  return foodizApi<{
    documents: PartnerDocument[];
    requiredDocumentTypes: PartnerDocumentType[];
  }>('partner-documents');
}

export async function uploadPartnerDocument(
  documentType: PartnerDocumentType,
  document: { uri: string; name: string; mimeType: string },
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
    'partner-documents',
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
    .from('partner-documents')
    .uploadToSignedUrl(prepared.path, prepared.token, body, {
      contentType: document.mimeType,
      upsert: false,
    });
  if (error) throw error;

  return foodizApi<{
    submitted: boolean;
    complete: boolean;
    message: string;
  }>('partner-documents', {
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
