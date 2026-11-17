/** Short random id; good enough for data that only lives on this device */
export const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
