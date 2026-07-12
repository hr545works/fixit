import { collection, getDocs, writeBatch, doc, query, limit, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { User } from './types';
import { OFFICIAL_STUDENTS, SEED_USERS } from './seedData';

export async function seedDatabaseIfEmpty() {
  try {
    // Check if the metadata document indicates we have already seeded once
    const metaRef = doc(db, 'metadata', 'seeding');
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists() && metaSnap.data()?.seeded) {
      console.log('Database already initialized once. Skipping seeding to preserve user modifications.');
      return;
    }

    console.log('Validating database accounts registry for first-time setup...');
    
    // Fetch all current users
    const usersSnap = await getDocs(query(collection(db, 'users')));
    const existingUsers = usersSnap.docs.map(doc => doc.data() as User);
    
    const batch = writeBatch(db);

    // 1. Delete users who are NOT in SEED_USERS
    const seedUserIds = new Set(SEED_USERS.map(s => s.id));
    for (const user of existingUsers) {
      if (!seedUserIds.has(user.id)) {
        console.log(`Deleting legacy/unauthorized account: ${user.name} (${user.id})`);
        const userRef = doc(db, 'users', user.id);
        batch.delete(userRef);
      }
    }

    // 2. Ensure all 31 official students and admin/committee/staff/management exist and have up-to-date Google Play Games avatars
    for (const seedUser of SEED_USERS) {
      const userRef = doc(db, 'users', seedUser.id);
      batch.set(userRef, seedUser, { merge: true });
    }

    // 3. Clean up any existing default complaints to ensure there are no pre-seeded default complaints
    const defaultComplaintIds = ['comp_1', 'comp_2', 'comp_3', 'comp_4'];
    for (const compId of defaultComplaintIds) {
      const cRef = doc(db, 'complaints', compId);
      batch.delete(cRef);
    }

    // 4. Mark database as seeded so we never overwrite deleted accounts or recreate anything
    batch.set(metaRef, { seeded: true, timestamp: Date.now() });

    await batch.commit();
    console.log('Database configuration updated and seeded successfully!');
  } catch (error) {
    console.warn('Database seeding skipped or postponed: Firestore is offline or unreachable.', error);
  }
}
