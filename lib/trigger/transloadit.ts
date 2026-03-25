export async function uploadToTransloadit(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const formData = new FormData();
  formData.append(
    "params",
    JSON.stringify({
      auth: { key: process.env.TRANSLOADIT_KEY },
      steps: { upload: { robot: "/upload/handle" } },
    }),
  );

  formData.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    fileName,
  );
  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transloadit upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return await pollTransloaditAssembly(result.assembly_ssl_url);
}

async function pollTransloaditAssembly(assemblyUrl: string): Promise<string> {
  const maxAttempts = 20;
  const intervalMs = 1500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const response = await fetch(assemblyUrl);
    const assembly = await response.json();

    if (assembly.ok === "ASSEMBLY_COMPLETED") {
      const file = assembly.results?.upload?.[0];
      if (!file?.ssl_url) {
        throw new Error("Transloadit completed but no file URL found.");
      }
      return file.ssl_url;
    }

    if (assembly.error) {
      throw new Error(`Transloadit assembly error: ${assembly.error}`);
    }
  }
  throw new Error("Transloadit assembly timed out.");
}
