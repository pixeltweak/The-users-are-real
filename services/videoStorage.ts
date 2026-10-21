/**
 * ============================================================================
 * FEATURE SPECIFIC MODULE: PERSISTENT VIDEO STORAGE SERVICE
 * Isolated IndexedDB storage collection for Google Veo generated videos.
 * Keeps all video storage operations independent of the main UI layer.
 * ============================================================================
 */

export interface VideoSegment {
  id: string;
  quote: string;
  durationSec: number;
  videoUrl?: string;
  videoBlob?: Blob;
}

export interface StoredVideo {
  id: string;
  quote: string;
  candidateName: string;
  generatedDate: string;
  thumbnailUrl: string;
  durationSec: number;
  videoBlob?: Blob;
  videoUrl?: string;
  promptUsed?: string;
  createdAt: number;
  mode?: '8s' | 'extended';
  segments?: VideoSegment[];
}

const DB_NAME = 'TheUsersAreReal_VideoStorage';
const DB_VERSION = 1;
const STORE_NAME = 'veo_videos';

/**
 * Open or upgrade the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error || new Error('Failed to open database'));
    };
  });
}

/**
 * Save a newly generated or updated video item to persistent browser storage.
 */
export async function saveStoredVideo(video: Omit<StoredVideo, 'createdAt'> & { createdAt?: number }): Promise<StoredVideo> {
  const db = await openDB();

  const record: StoredVideo = {
    ...video,
    createdAt: video.createdAt || Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Storing the record (IndexedDB handles Blobs directly in all modern browsers)
    const request = store.put(record);

    request.onsuccess = () => {
      // Ensure videoUrl exists for immediate preview safely
      if (record.videoBlob instanceof Blob && !record.videoUrl) {
        try {
          record.videoUrl = URL.createObjectURL(record.videoBlob);
        } catch (e) {
          console.warn('Could not create object URL for video blob:', e);
        }
      }
      resolve(record);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to save video to storage'));
    };
  });
}

/**
 * Retrieve all persisted videos from storage, sorted newest first.
 * Automatically recreates Blob Object URLs for seamless HTML5 video playback.
 */
export async function getAllStoredVideos(): Promise<StoredVideo[]> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      // Safely check if index exists to prevent DOMException
      let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
      if (store.indexNames.contains('createdAt')) {
        const index = store.index('createdAt');
        cursorRequest = index.openCursor(null, 'prev');
      } else {
        cursorRequest = store.openCursor();
      }

      const items: StoredVideo[] = [];

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item = cursor.value as StoredVideo;
          // Hydrate Blob into a playable Object URL if needed safely
          if (item.videoBlob instanceof Blob && !item.videoUrl) {
            try {
              item.videoUrl = URL.createObjectURL(item.videoBlob);
            } catch (err) {
              console.warn('Failed to generate object URL for stored video blob', err);
            }
          }
          items.push(item);
          cursor.continue();
        } else {
          // Sort items in memory if index was not available
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(items);
        }
      };

      cursorRequest.onerror = () => {
        reject(cursorRequest.error || new Error('Failed to load videos from storage'));
      };
    });
  } catch (err) {
    console.warn('Persistent video storage not available or empty:', err);
    return [];
  }
}

/**
 * Fetch a single stored video by its ID.
 */
export async function getStoredVideoById(id: string): Promise<StoredVideo | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const item = request.result as StoredVideo | undefined;
      if (!item) {
        resolve(null);
        return;
      }
      if (item.videoBlob instanceof Blob && !item.videoUrl) {
        try {
          item.videoUrl = URL.createObjectURL(item.videoBlob);
        } catch (e) {
          console.warn('Could not create object URL for single video:', e);
        }
      }
      resolve(item);
    };

    request.onerror = () => {
      reject(request.error || new Error(`Failed to load video ${id}`));
    };
  });
}

/**
 * Delete a specific video from persistent storage.
 */
export async function deleteStoredVideo(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error(`Failed to delete video ${id}`));
  });
}

/**
 * Clear all stored videos.
 */
export async function clearAllStoredVideos(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to clear video storage'));
  });
}

/**
 * Export / download a stored video file directly to the user's computer.
 */
export function exportStoredVideo(item: StoredVideo): void {
  const url = item.videoUrl || (item.videoBlob ? URL.createObjectURL(item.videoBlob) : null);
  if (!url) return;

  const a = document.createElement('a');
  a.href = url;
  const safeName = (item.candidateName || 'candidate').toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `veo-${safeName}-${item.id}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
