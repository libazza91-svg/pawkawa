import { parsePetbarnPilotCliArgs, runPetbarnPilot } from '../ingestion/retail/petbarn-pilot';

async function main() {
  const cli = parsePetbarnPilotCliArgs();
  const result = await runPetbarnPilot({
    urls: cli.urls,
    manifestPath: cli.manifestPath,
    capturedAt: process.env.PETBARN_PILOT_CAPTURED_AT,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Petbarn pilot ingestion failed:', error);
    process.exit(1);
  });
