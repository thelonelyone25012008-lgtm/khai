import { ChatMessage } from '../types';

const DB_NAME = 'NovaDB';
const DB_VERSION = 2; // Incremented version for schema change
const HISTORY_STORE_NAME = 'chatHistory';
const USER_STORE_NAME = 'users';

let db: IDBDatabase;

// Function to initialize the database
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', request.error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
                db.createObjectStore(USER_STORE_NAME, { keyPath: 'username' });
            }
        };
    });
};

// Function to register a new user
export const registerUser = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(USER_STORE_NAME);
        const request = store.get(username);

        request.onerror = () => reject('Lỗi khi truy cập kho lưu trữ người dùng');
        
        request.onsuccess = () => {
            if (request.result) {
                // User already exists
                resolve({ success: false, error: 'Tên người dùng đã tồn tại.' });
            } else {
                // User does not exist, register them
                const newUser = { username, password };
                const addRequest = store.add(newUser);
                addRequest.onsuccess = () => resolve({ success: true });
                addRequest.onerror = () => reject('Không thể tạo người dùng mới');
            }
        };
    });
};


// Function to log in an existing user
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_STORE_NAME], 'readonly');
        const store = transaction.objectStore(USER_STORE_NAME);
        const request = store.get(username);

        request.onerror = () => reject('Lỗi khi truy cập kho lưu trữ người dùng');
        
        request.onsuccess = () => {
            const user = request.result;
            if (user) {
                // User exists, check password
                if (user.password === password) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'Mật khẩu không đúng.' });
                }
            } else {
                // User does not exist
                resolve({ success: false, error: 'Tên người dùng không tồn tại.' });
            }
        };
    });
};


// Function to get chat history for a user
export const getChatHistory = async (username: string): Promise<ChatMessage[] | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.get(username);

        request.onerror = () => {
            reject('Error fetching history');
        };

        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.messages);
            } else {
                resolve(null);
            }
        };
    });
};

// Function to save chat history for a user
export const saveChatHistory = async (username: string, messages: ChatMessage[]): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.put({ username, messages });

        request.onerror = () => {
            reject('Error saving history');
        };

        request.onsuccess = () => {
            resolve();
        };
    });
};