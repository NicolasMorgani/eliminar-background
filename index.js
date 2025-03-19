import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
import path from "path";

// Función para convertir Blob a Buffer
async function blobToBuffer(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Función principal
async function main() {
  try {
    // Ruta de la imagen de entrada
    const inputPath = "./input-image.png";
    // Ruta de la imagen de salida
    const outputPath = "./output-image.png";

    // Verificar si el archivo existe
    if (!fs.existsSync(inputPath)) {
      console.error("El archivo de entrada no existe:", inputPath);
      process.exit(1);
    }

    console.log("Procesando imagen...");

    // Convertir la ruta del archivo a URL
    const absolutePath = path.resolve(inputPath);
    const imageUrl = `file://${absolutePath}`;

    // Remover el fondo de la imagen usando URL
    const blob = await removeBackground(imageUrl);

    // Convertir Blob a Buffer y guardar
    const buffer = await blobToBuffer(blob);
    fs.writeFileSync(outputPath, buffer);
    console.log("Imagen guardada exitosamente en:", outputPath);
  } catch (error) {
    console.error("Error al eliminar el fondo:", error.message);
  }
}

// Ejecutar la función principal
main();