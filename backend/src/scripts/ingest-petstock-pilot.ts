import { parsePetstockPilotCliArgs, runPetstockPilot } from '../ingestion/retail/petstock-pilot';

function readEnvUrls(): string[] {
  return process.env.PETSTOCK_PILOT_URLS?.split(',').map((url) => url.trim()).filter(Boolean) ?? [];
}

if (require.main === module) {
  const cliInput = parsePetstockPilotCliArgs();
  const envUrls = readEnvUrls();
  const urls = cliInput.urls.length > 0 ? cliInput.urls : envUrls;

  runPetstockPilot({
    urls: urls.length > 0 ? urls : undefined,
    manifestPath: cliInput.manifestPath,
    capturedAt: process.env.PETSTOCK_PILOT_CAPTURED_AT,
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Petstock pilot failed:', error);
      process.exit(1);
    });
}

export { parsePetstockPilotCliArgs, runPetstockPilot };
