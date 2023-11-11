export async function preprocessImage(file: File) {
  // Dynamically import tfjs to fix issue with SSR
  const tf = await import("@tensorflow/tfjs");
  const imageBitmap = await createImageBitmap(file);
  const imageTensor = tf.browser.fromPixels(imageBitmap);
  const imageReshaped = tf.image.resizeBilinear(imageTensor, [28, 28]);
  const grayScaleImage = tf.image.rgbToGrayscale(imageReshaped);
  return grayScaleImage.div(255);
}
