const Database = require('better-sqlite3')

function openReadOnly(path) {
  return new Database(path, { readonly: true, fileMustExist: true })
}

function checkIntegrity(path) {
  const db = openReadOnly(path)
  const integrity = db.pragma('integrity_check', { simple: true })
  db.close()

  if (integrity !== 'ok') {
    throw new Error(`Integrity check failed: ${integrity}`)
  }

  return integrity
}

async function main() {
  const [command, sourcePath, targetPath] = process.argv.slice(2)

  if (command === 'check' && sourcePath) {
    process.stdout.write(JSON.stringify({ path: sourcePath, integrity: checkIntegrity(sourcePath) }))
    return
  }

  if (command !== 'backup' || !sourcePath || !targetPath) {
    throw new Error('Usage: node sqlite-backup.js backup <source> <target> | check <path>')
  }

  const source = openReadOnly(sourcePath)
  try {
    await source.backup(targetPath)
  } finally {
    source.close()
  }

  process.stdout.write(JSON.stringify({
    sourcePath,
    backupPath: targetPath,
    integrity: checkIntegrity(targetPath),
  }))
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
