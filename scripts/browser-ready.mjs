// Read-only preflight. This script never starts a server or opens a browser.
const args = process.argv.slice(2);
const expectedRole = args.find((arg) => arg.startsWith("--role="))?.slice(7);
const timeoutMs = Number(
  args.find((arg) => arg.startsWith("--timeout="))?.slice(10) ?? 180000,
);
if (
  args.some((arg) => !/^--(role|timeout)=/.test(arg)) ||
  (expectedRole && !["student", "teacher"].includes(expectedRole)) ||
  !Number.isSafeInteger(timeoutMs) ||
  timeoutMs < 1 ||
  timeoutMs > 180000
) {
  console.error("Gunakan --role=student|teacher dan --timeout=1..180000 (ms).");
  process.exit(1);
}
const deadline = Date.now() + timeoutMs;
let lastError = "Server belum merespons.";
let lastNotice = 0;
let fatal = false;
async function request(path) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Batas waktu kesiapan habis.");
  const response = await fetch("http://localhost:3000" + path, {
    signal: AbortSignal.timeout(Math.min(15000, remaining)),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return body;
}
while (Date.now() < deadline) {
  try {
    const me = JSON.parse(await request("/api/v1/me"));
    if (me.error || !["student", "teacher"].includes(me.data?.role)) {
      fatal = true;
      throw new Error("Identitas aplikasi belum mendukung siswa/tutor.");
    }
    if (expectedRole && me.data.role !== expectedRole) {
      fatal = true;
      throw new Error(
        `Peran aktif ${me.data.role}; yang diminta ${expectedRole}.`,
      );
    }
    const ledger = JSON.parse(await request("/api/v1/skk"));
    if (ledger.error || !Array.isArray(ledger.data?.allocations))
      throw new Error("API D1 belum menghasilkan respons ledger yang valid.");
    const html = await request("/");
    if (!/<html[\s>]/i.test(html) || !html.includes("RuangTumbuh"))
      throw new Error("Port 3000 belum menyajikan halaman RuangTumbuh.");
    console.log(
      `Siap membuka satu tab http://localhost:3000/; peran ${me.data.role}; API/D1 dan HTML merespons. Render browser tetap perlu diverifikasi.`,
    );
    process.exit(0);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Server belum siap.";
    if (fatal) break;
    if (Date.now() - lastNotice >= 10000) {
      console.log("Menunggu server port 3000; belum membuka tab browser.");
      lastNotice = Date.now();
    }
    const remaining = deadline - Date.now();
    if (remaining > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000, remaining)),
      );
  }
}
console.error(`Browser belum dibuka: ${lastError}`);
process.exitCode = 1;
