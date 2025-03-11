import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

let vendorMarkers = [];

async function filterVendorsByFood(foodType) {
    console.log(`🔍 Searching for vendors selling: "${foodType}"`);

    // Clear existing markers
    vendorMarkers.forEach(marker => marker.setMap(null));
    vendorMarkers = [];

    const querySnapshot = await getDocs(collection(db, "vendors"));
    let foundVendors = 0;
    let bounds = new google.maps.LatLngBounds();

    querySnapshot.forEach(doc => {
        let data = doc.data();
        let vendorId = doc.id; // Store vendor ID
        let vendorFood = data.specialty.trim();
        let lat = parseFloat(data.latitude);
        let lng = parseFloat(data.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            console.error(`❌ Invalid coordinates for ${data.name}:`, data.latitude, data.longitude);
            return;
        }

        if (vendorFood === foodType.trim()) {
            foundVendors++;

            let marker = new google.maps.Marker({
                position: { lat, lng },
                map: window.map,
                title: data.name
            });

            vendorMarkers.push(marker);
            bounds.extend(marker.position);

            let infoWindow = new google.maps.InfoWindow({
                content: `<h3>${data.name}</h3>
                          <p>Location: ${data.location}</p>
                          <p>Specialty: ${data.specialty}</p>`
            });

            marker.addListener("click", () => {
                infoWindow.open(window.map, marker);

                // Enable "Leave a Review" button and set the vendor ID
                let reviewButton = document.getElementById("leave-review-btn");
                reviewButton.disabled = false;
                reviewButton.setAttribute("data-vendor-id", vendorId);

                console.log("✅ Vendor ID Set from food selection:", vendorId);
            });
        }
    });

    if (foundVendors > 0) {
        console.log(`✅ Found ${foundVendors} vendors for "${foodType}"`);
        window.map.fitBounds(bounds);
    } else {
        alert(`No vendors found for ${foodType}.`);
    }
}

// Enable "Leave a Review" button when a vendor is selected
async function searchVendorByName() {
    let searchName = document.getElementById("search-input").value.trim().toLowerCase();

    if (searchName === "") {
        alert("Please enter a business name to search.");
        return;
    }

    console.log(`🔍 Searching for vendor: "${searchName}"`);

    // Clear existing markers
    vendorMarkers.forEach(marker => marker.setMap(null));
    vendorMarkers = [];

    const querySnapshot = await getDocs(collection(db, "vendors"));
    let vendorFound = false;

    querySnapshot.forEach(doc => {
        let data = doc.data();
        let vendorName = data.name.trim().toLowerCase();
        let lat = parseFloat(data.latitude);
        let lng = parseFloat(data.longitude);

        if (vendorName === searchName) {
            vendorFound = true;

            let marker = new google.maps.Marker({
                position: { lat, lng },
                map: window.map,
                title: data.name
            });

            vendorMarkers.push(marker);

            let infoWindow = new google.maps.InfoWindow({
                content: `<h3>${data.name}</h3>
                          <p>Location: ${data.location}</p>
                          <p>Specialty: ${data.specialty}</p>`
            });

            marker.addListener("click", () => {
                infoWindow.open(window.map, marker);
            
                // Enable "Leave a Review" button
                let reviewButton = document.getElementById("leave-review-btn");
                reviewButton.disabled = false;
                reviewButton.setAttribute("data-vendor-id", vendorId);
            
                console.log("✅ Vendor ID Set from search:", vendorId);
            });            

            window.map.setCenter({ lat, lng });
            window.map.setZoom(15);
        }
    });

    if (!vendorFound) {
        alert(`No vendor found with the name "${searchName}".`);
    }
}

// Attach search function to button click
document.getElementById("search-button").addEventListener("click", searchVendorByName);
document.getElementById("search-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        searchVendorByName();
    }
});

// Enable Review Form when clicking "Leave a Review"
document.getElementById("leave-review-btn").addEventListener("click", function () {
    document.getElementById("review-form").style.display = "block";
});

// Star rating logic
document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", function () {
        let rating = this.getAttribute("data-value");
        document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));
        for (let i = 0; i < rating; i++) {
            document.querySelectorAll(".star")[i].classList.add("selected");
        }
        document.getElementById("review-form").setAttribute("data-rating", rating);
    });
});

// Submit Review
document.getElementById("submit-review").addEventListener("click", async function () {
    let vendorId = document.getElementById("leave-review-btn").getAttribute("data-vendor-id") || null;

if (!vendorId) {
    alert("Error: No vendor selected for review.");
    return;
}
    let name = document.getElementById("reviewer-name").value.trim();
    let rating = document.getElementById("review-form").getAttribute("data-rating");
    let reviewText = document.getElementById("review-text").value.trim();

    if (!name || !rating || !reviewText) {
        alert("Please complete all fields.");
        return;
    }

    try {
        await addDoc(collection(db, "vendors", vendorId, "reviews"), {
            name,
            rating: parseInt(rating),
            reviewText,
            date: new Date().toLocaleString()
        });

        alert("Review submitted successfully!");
        document.getElementById("review-form").style.display = "none";
        document.getElementById("reviewer-name").value = "";
        document.getElementById("review-text").value = "";
        document.querySelectorAll(".star").forEach(s => s.classList.remove("selected"));

        loadReviews(vendorId);
    } catch (error) {
        console.error("Error submitting review:", error);
    }
});

// Load reviews
async function loadReviews(vendorId) {
    const reviewsRef = collection(db, "vendors", vendorId, "reviews");
    const snapshot = await getDocs(reviewsRef);
    const reviewList = document.getElementById("review-list");

    // Clear old reviews
    reviewList.innerHTML = "";

    let reviews = [];

    // Fetch all reviews and store them in an array
    snapshot.forEach(doc => {
        reviews.push(doc.data());
    });

    // Sort reviews by date (latest first)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Show only the latest 2 reviews
    let displayedReviews = reviews.slice(0, 2);

    displayedReviews.forEach(data => {
        let reviewHTML = `
            <div class="review">
                <p><strong>${data.name}</strong> - ${data.date}</p>
                <p>${"★".repeat(data.rating)}</p>
                <p>${data.reviewText}</p>
            </div>
        `;
        reviewList.innerHTML += reviewHTML;
    });

    // If there are more than 2 reviews, show a "View More" button
    if (reviews.length > 2) {
        let viewMoreBtn = document.createElement("button");
        viewMoreBtn.textContent = "View More Reviews";
        viewMoreBtn.onclick = function () {
            reviewList.innerHTML = ""; // Clear and show all reviews
            reviews.forEach(data => {
                let fullReviewHTML = `
                    <div class="review">
                        <p><strong>${data.name}</strong> - ${data.date}</p>
                        <p>${"★".repeat(data.rating)}</p>
                        <p>${data.reviewText}</p>
                    </div>
                `;
                reviewList.innerHTML += fullReviewHTML;
            });
            viewMoreBtn.remove(); // Remove the button after clicking
        };
        reviewList.appendChild(viewMoreBtn);
    }
}

