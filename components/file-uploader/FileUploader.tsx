"use client";
import { MutableRefObject, useEffect, useState } from "react";
import styles from "./FileUploader.module.scss";
import cn from "classnames";
import imageCompression from "browser-image-compression";

export function FileUploader({
  className = "",
  onFileUploading = () => {},
  onFileUploaded = () => {},
  fileUrl,
  disabled = false,
  inputRef,
}: {
  className?: string;
  onFileUploading?: () => any;
  onFileUploaded?: (image: { file?: File; url: any }) => void;
  fileUrl?: string;
  disabled?: boolean;
  inputRef: MutableRefObject<HTMLInputElement | undefined>;
}) {
  const [file, setFile] = useState<{
    file?: File;
    url: any;
  }>();

  useEffect(() => {
    if (fileUrl && (!file?.url || !file)) {
      console.log(fileUrl);
      setFile({
        url: fileUrl,
      });
    }
  }, [fileUrl]);

  const onFileChange = () => {
    if (
      inputRef &&
      inputRef.current &&
      inputRef.current.files &&
      inputRef.current.files[0]
    ) {
      onFileUploading();
      const files = inputRef.current.files;
      let file = files[0];
      const reader = new FileReader();
      reader.onloadend = async (e) => {
        if (file.type.startsWith("image/")) {
          file = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
        }
        if (e.target && e.target.result) {
          const base64 = e.target.result;
          setFile({
            file,
            url: base64,
          });
          console.log(file);
          onFileUploaded({
            file,
            url: base64,
          });
        }
      };
      reader.onerror = (e) => {
        if (e.target && e.target.error) {
          console.log(e.target.error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      onClick={() => {
        if (inputRef && inputRef.current && !disabled) {
          inputRef.current.click();
        } else {
          window.open(fileUrl);
        }
      }}
      className={cn({
        [styles.container]: true,
        [className]: !!className,
        [styles.disabled]: disabled,
      })}
    >
      <input
        accept="image/*"
        onChange={onFileChange}
        ref={inputRef as MutableRefObject<HTMLInputElement>}
        type="file"
        style={{ display: "none" }}
      />
    </div>
  );
}
