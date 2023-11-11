import styles from "./page.module.scss";
// import ImageUploader from "./_components/image-uploader/image-uploader";
import { MNISTDraw } from "@/components/mnist-draw/MNISTDraw";

export default function Home() {
  return (
    <div className={styles.container}>
      <MNISTDraw />
    </div>
  );
}
