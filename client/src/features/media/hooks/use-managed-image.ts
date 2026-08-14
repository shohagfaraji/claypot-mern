import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { discardImage } from '@/features/media/api/upload-image';
import type { ImagePurpose, ManagedImage } from '@/features/media/types';

export function useManagedImage(initialImage: ManagedImage | null, purpose: ImagePurpose) {
  const request = useAuthenticatedRequest();
  const requestRef = useRef(request);
  const persistedPublicIdRef = useRef(initialImage?.publicId ?? null);
  const pendingPublicIdRef = useRef<string | null>(null);
  const [image, setImageState] = useState(initialImage);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const discard = useCallback(
    (publicId: string) => {
      void discardImage(requestRef.current, purpose, publicId).catch(() => undefined);
    },
    [purpose],
  );

  const setImage = useCallback(
    (nextImage: ManagedImage | null) => {
      const nextPublicId = nextImage?.publicId ?? null;
      const pendingPublicId = pendingPublicIdRef.current;

      if (pendingPublicId !== null && pendingPublicId !== nextPublicId) {
        discard(pendingPublicId);
      }

      pendingPublicIdRef.current =
        nextPublicId !== null && nextPublicId !== persistedPublicIdRef.current
          ? nextPublicId
          : null;
      setImageState(nextImage);
    },
    [discard],
  );

  const commit = useCallback((savedImage: ManagedImage | null) => {
    persistedPublicIdRef.current = savedImage?.publicId ?? null;
    pendingPublicIdRef.current = null;
    setImageState(savedImage);
  }, []);

  useEffect(() => {
    return () => {
      const pendingPublicId = pendingPublicIdRef.current;
      if (pendingPublicId !== null) {
        void discardImage(requestRef.current, purpose, pendingPublicId).catch(() => undefined);
      }
    };
  }, [purpose]);

  return { image, setImage, commit };
}
