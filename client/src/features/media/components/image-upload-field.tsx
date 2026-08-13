import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { uploadImage } from '@/features/media/api/upload-image';
import type { ImagePurpose, ManagedImage } from '@/features/media/types';
import { cn } from '@/lib/utils';

const acceptedImageTypes = ['image/avif', 'image/jpeg', 'image/png', 'image/webp'];
const maximumImageBytes = 8 * 1024 * 1024;

interface ImageUploadFieldProps {
  label: string;
  description: string;
  purpose: ImagePurpose;
  value: ManagedImage | null;
  disabled?: boolean;
  aspect?: 'landscape' | 'square';
  onChange: (image: ManagedImage | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

function validateImage(file: File): string | null {
  if (!acceptedImageTypes.includes(file.type)) {
    return 'Choose an AVIF, JPEG, PNG, or WebP image.';
  }

  if (file.size > maximumImageBytes) {
    return 'Choose an image smaller than 8 MB.';
  }

  return null;
}

export function ImageUploadField({
  label,
  description,
  purpose,
  value,
  disabled = false,
  aspect = 'landscape',
  onChange,
  onUploadingChange,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const request = useAuthenticatedRequest();
  const abortControllerRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (objectUrlRef.current !== null) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function clearPreview() {
    if (objectUrlRef.current !== null) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreviewUrl(null);
  }

  async function handleFile(file: File) {
    const validationError = validateImage(file);

    if (validationError !== null) {
      setError(validationError);
      return;
    }

    abortControllerRef.current?.abort();
    clearPreview();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setError(null);
    setProgress(0);
    setIsUploading(true);
    onUploadingChange?.(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const image = await uploadImage(request, file, purpose, setProgress, abortController.signal);
      onChange(image);
    } catch (uploadError) {
      if (!(uploadError instanceof DOMException && uploadError.name === 'AbortError')) {
        setError(
          uploadError instanceof Error ? uploadError.message : 'The image could not be uploaded.',
        );
      }
    } finally {
      if (objectUrlRef.current === objectUrl) clearPreview();
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    }
  }

  const displayedImage = previewUrl ?? value?.url ?? null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-muted/35',
          aspect === 'square' ? 'aspect-square' : 'aspect-[16/9]',
        )}
      >
        {displayedImage ? (
          <img
            className="size-full object-cover"
            src={displayedImage}
            alt="Selected upload preview"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <div className="text-center">
              <ImagePlus className="mx-auto size-7" />
              <p className="mt-2 text-xs">No image selected</p>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-sm">
            <div className="text-center">
              <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-2 text-sm font-semibold">Uploading {progress}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden={!isUploading}>
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: isUploading ? `${progress}%` : '0%' }}
        />
      </div>

      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept={acceptedImageTypes.join(',')}
        disabled={disabled || isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <label
          className={cn(
            buttonVariants({ variant: 'outline' }),
            (disabled || isUploading) && 'pointer-events-none opacity-50',
          )}
          htmlFor={inputId}
          aria-disabled={disabled || isUploading}
        >
          <Upload />
          {value || previewUrl ? 'Replace image' : 'Choose image'}
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || isUploading}
            onClick={() => {
              clearPreview();
              setError(null);
              onChange(null);
            }}
          >
            <Trash2 />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
