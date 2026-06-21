import readline from 'readline';
import { Writable } from 'stream';
import { createAdminUser } from '../admin/auth';

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    parsed[current.slice(2)] = argv[index + 1];
    index += 1;
  }

  return parsed;
}

async function readPasswordFromPrompt(): Promise<string> {
  const mutableStdout = new WritableMask(process.stdout);
  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  });

  mutableStdout.muted = true;
  const password = await new Promise<string>((resolve) => {
    rl.question('Password: ', (answer) => resolve(answer));
  });
  rl.close();
  process.stdout.write('\n');
  return password;
}

class WritableMask extends Writable {
  public muted = false;

  constructor(private readonly stream: NodeJS.WriteStream) {
    super();
  }

  override _write(
    chunk: string | Uint8Array,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    if (!this.muted) {
      this.stream.write(chunk as never, encoding as never, callback as never);
      return;
    }

    callback();
  }
}

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8').trim();
  }

  return readPasswordFromPrompt();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email;
  const name = args.name;

  if (!email || !name) {
    throw new Error('Usage: npm run admin:create-user -- --email admin@example.com --name Barry');
  }

  const password = await readPassword();
  if (!password) {
    throw new Error('Password is required.');
  }

  const user = await createAdminUser({ email, name, password });
  console.log(`Admin user created: ${user.email} (${user.name})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
