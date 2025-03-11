// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { addDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDFs7Y7PukBkzmRyXQmspWQBSRAi3OnSG0",
    authDomain: "streetbitesmanila.firebaseapp.com",
    projectId: "streetbitesmanila",
    storageBucket: "streetbitesmanila.firebasestorage.app",
    messagingSenderId: "1021749848726",
    appId: "1:1021749848726:web:a689a91cf71cbee21170b7",
    measurementId: "G-4ZHXZ188WG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to get the average rating of a vendor
async function getAverageRating(vendorId) {
    const reviewsRef = collection(db, "vendors", vendorId, "reviews");
    const snapshot = await getDocs(reviewsRef);

    let totalRating = 0;
    let count = 0;

    snapshot.forEach(doc => {
        totalRating += doc.data().rating;
        count++;
    });

    return count > 0 ? (totalRating / count).toFixed(1) : "No ratings yet";
}

// Export Firestore, addDoc, and function for use in other scripts
export { db, addDoc, getAverageRating };
