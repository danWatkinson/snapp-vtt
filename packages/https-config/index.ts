import fs from "fs";
import path from "path";

export interface CertificateConfig {
  key: Buffer;
  cert: Buffer;
}

/**
 * Loads HTTPS certificates from the configured location.
 * 
 * Certificate paths are determined by environment variables:
 * - HTTPS_CERT_DIR: Directory containing certificates (default: ../Snapp-other/certs)
 * - HTTPS_KEY_PATH: Full path to private key (default: ${HTTPS_CERT_DIR}/localhost-key.pem)
 * - HTTPS_CERT_PATH: Full path to certificate (default: ${HTTPS_CERT_DIR}/localhost-cert.pem)
 * 
 * @returns Certificate configuration with key and cert buffers
 * @throws Error if certificates cannot be read
 */
export function loadCertificates(): CertificateConfig {
  const certDir =
    process.env.HTTPS_CERT_DIR ??
    path.join(process.cwd(), "..", "Snapp-other", "certs");
  const keyPath =
    process.env.HTTPS_KEY_PATH ?? path.join(certDir, "localhost-key.pem");
  const certPath =
    process.env.HTTPS_CERT_PATH ?? path.join(certDir, "localhost-cert.pem");

  try {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (err) {
    const error = err as Error;
    throw new Error(
      `Failed to load certificates: ${error.message}. ` +
        `Key: ${keyPath}, Cert: ${certPath}`
    );
  }
}
