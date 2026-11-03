const DB_NAME = "aeropicker.files"
const STORE = "resumes"

function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Could not open resume storage."))
  })
}

function finish(request: IDBRequest, database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      database.close()
      resolve()
    }
    request.onerror = () => {
      database.close()
      reject(request.error ?? new Error("Could not store the PDF."))
    }
  })
}

export async function saveResumeFile(id: string, file: Blob): Promise<void> {
  const database = await openFiles()
  const request = database.transaction(STORE, "readwrite").objectStore(STORE).put(file, id)
  await finish(request, database)
}

export async function deleteResumeFile(id: string): Promise<void> {
  const database = await openFiles()
  const request = database.transaction(STORE, "readwrite").objectStore(STORE).delete(id)
  await finish(request, database)
}
