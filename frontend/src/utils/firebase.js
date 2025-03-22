// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs, query, where, deleteDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4liXamXvw2yJbG75cN-ctx3oS1vniYZM",
  authDomain: "genaigenesis-8fed2.firebaseapp.com",
  projectId: "genaigenesis-8fed2",
  storageBucket: "genaigenesis-8fed2.appspot.com",
  messagingSenderId: "957431814802",
  appId: "1:957431814802:web:20eee2178799488bc9644b",
  measurementId: "G-THN443J1V5"
};

// Initialize Firebase
console.log("Initializing Firebase app...");
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized");

// Initialize Auth
console.log("Initializing Firebase Auth...");
const auth = getAuth(app);
console.log("Firebase Auth initialized");

// Initialize Firestore
console.log("Initializing Firestore...");
const db = getFirestore(app);
console.log("Firestore initialized");

// Auth functions
export const registerUser = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

// Firestore functions for user environments
export const createUserDocument = async (userId, userData = {}) => {
  if (!userId) {
    console.error("No userId provided to createUserDocument");
    return;
  }
  
  try {
    console.log(`Creating/updating user document for userId: ${userId}`);
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const { email } = userData;
      console.log(`User document does not exist, creating new document with email: ${email}`);
      
      try {
        await setDoc(userRef, {
          email,
          owned_environments: [],
          created_at: new Date()
        });
        console.log("User document created successfully");
      } catch (error) {
        console.error("Error creating user document:", error);
        throw error;
      }
    } else {
      console.log("User document already exists");
    }
    
    return userRef;
  } catch (error) {
    console.error("Error in createUserDocument:", error);
    throw error;
  }
};

export const createEnvironment = async (userId, environmentData) => {
  if (!userId) {
    console.error("No userId provided to createEnvironment");
    return null;
  }
  
  try {
    console.log(`Creating environment for userId: ${userId}`);
    // Create a new environment document
    const environmentsRef = collection(db, "environments");
    const newEnvironmentRef = doc(environmentsRef);
    
    console.log("Creating new environment document");
    await setDoc(newEnvironmentRef, {
      ...environmentData,
      owner_id: userId,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    // Add the environment ID to the user's owned_environments array
    console.log(`Adding environment ${newEnvironmentRef.id} to user's owned_environments`);
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      owned_environments: arrayUnion(newEnvironmentRef.id)
    });
    
    console.log("Environment created successfully:", newEnvironmentRef.id);
    return newEnvironmentRef.id;
  } catch (error) {
    console.error("Error creating environment:", error);
    return null;
  }
};

export const getUserEnvironments = async (userId) => {
  if (!userId) {
    console.error("No userId provided to getUserEnvironments");
    return [];
  }
  
  try {
    console.log(`Getting environments for userId: ${userId}`);
    // Get the user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("User document does not exist, creating it now");
      await createUserDocument(userId, { email: auth.currentUser?.email });
      return [];
    }
    
    const userData = userDoc.data();
    if (!userData) {
      console.error("User document exists but has no data");
      return [];
    }
    
    const environmentIds = userData.owned_environments || [];
    console.log(`Found ${environmentIds.length} environments for user`);
    
    if (environmentIds.length === 0) {
      console.log("User has no environments");
      return [];
    }
    
    // Get all environments documents
    const environments = [];
    for (const envId of environmentIds) {
      try {
        console.log(`Fetching environment: ${envId}`);
        const envRef = doc(db, "environments", envId);
        const envDoc = await getDoc(envRef);
        
        if (envDoc.exists()) {
          environments.push({
            id: envId,
            ...envDoc.data()
          });
          console.log(`Added environment: ${envId}`);
        } else {
          console.log(`Environment ${envId} not found, may need to be removed from user's list`);
        }
      } catch (envError) {
        console.error(`Error fetching environment ${envId}:`, envError);
        // Continue with other environments even if one fails
      }
    }
    
    console.log(`Returning ${environments.length} environments`);
    return environments;
  } catch (error) {
    console.error("Error getting user environments:", error);
    throw error; // Throw the error to trigger the error state in the UI
  }
};

export const deleteEnvironment = async (userId, environmentId) => {
  if (!userId || !environmentId) {
    console.error("Missing userId or environmentId in deleteEnvironment");
    return false;
  }
  
  try {
    console.log(`Deleting environment ${environmentId} for user ${userId}`);
    
    // Delete the environment document
    const envRef = doc(db, "environments", environmentId);
    await deleteDoc(envRef);
    console.log(`Environment document ${environmentId} deleted`);
    
    // Remove the environment ID from the user's owned_environments array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      owned_environments: arrayRemove(environmentId)
    });
    console.log(`Removed environment ${environmentId} from user's owned_environments`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting environment ${environmentId}:`, error);
    return false;
  }
};

export { auth, app, db }; 