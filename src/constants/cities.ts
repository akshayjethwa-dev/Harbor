// src/constants/cities.ts
// A comprehensive list of major Indian cities.
// For the full 1200+ dataset, you can install the npm package: `india-location-kit`
// and import its `search` function here.

export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna",
  "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli",
  "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad",
  "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur",
  "Kota", "Chandigarh", "Guwahati", "Solapur", "Hubli-Dharwad", "Tiruchirappalli", "Bareilly", "Mysore",
  "Tiruppur", "Gurgaon", "Aligarh", "Jalandhar", "Bhubaneswar", "Salem", "Mira-Bhayandar", "Warangal",
  "Guntur", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai",
  "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol", "Rourkela",
  "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi",
  "Ulhasnagar", "Nellore", "Jammu", "Sangli-Miraj", "Belgaum", "Mangalore", "Ambattur", "Tirunelveli",
  "Malegaon", "Gaya", "Jalgaon", "Udaipur", "Maheshtala", "Davanagere", "Kozhikode", "Kurnool", "Rajpur Sonarpur",
  "Rajahmundry", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur", "Agartala", "Bhagalpur",
  "Muzaffarnagar", "Bhatpara", "Panihati", "Latur", "Dhule", "Tirupati", "Rohtak", "Korba", "Bhilwara",
  "Brahmapur", "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Kamarhati", "Sambalpur",
  "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur", "Shivamogga", "Chandrapur", "Junagadh", "Thrissur",
  "Alwar", "Bardhaman", "Kulti", "Kakinada", "Nizamabad", "Parbhani", "Tumkur", "Khammam", "Ozhukarai",
  "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl", "Dewas", "Ichalkaranji", "Karnal", "Bathinda",
  "Jalna", "Eluru", "Barasat", "Kirari Suleman Nagar", "Purnia", "Satna", "Mau", "Sonipat", "Farrukhabad",
  "Sagar", "Rourkela", "Durg", "Imphal", "Ratlam", "Hapur", "Arrah", "Anantapur", "Karimnagar", "Etawah",
  "Ambernath", "North Dumdum", "Bharatpur", "Begusarai", "New Delhi", "Gandhidham", "Baranagar", "Tiruvottiyur",
  "Pondicherry", "Sikar", "Thoothukudi", "Rewa", "Mirzapur", "Raichur", "Pali", "Ramagundam", "Haridwar",
  "Vijayanagaram", "Katihar", "Nagercoil", "Sri Ganganagar", "Karawal Nagar", "Mango", "Thanjavur", "Bulandshahr",
  "Uluberia", "Katni", "Sambhal", "Singrauli", "Nadiad", "Secunderabad", "Naihati", "Yamunanagar", "Bidhannagar",
  "Pallavaram", "Bidar", "Munger", "Panchkula", "Burhanpur", "Raurkela", "Kharagpur", "Dindigul", "Gandhinagar",
  "Hospet", "Nangloi Jat", "Malda", "Ongole", "Deoghar", "Chapra", "Haldia", "Khandwa", "Nandyal", "Morena",
  "Amroha", "Anand", "Bhind", "Bhalswa Jahangir Pur", "Madhyamgram", "Bhiwani", "Navsari", "Baharampur",
  "Ambala", "Morvi", "Fatehpur", "Rae Bareli", "Khora", "Bhusawal", "Orai", "Bahraich", "Vellore", "Mahesana",
  "Sambalpur", "Raiganj", "Sirsa", "Danapur", "Serampore", "Guna", "Jaunpur", "Panvel", "Shivpuri", "Surendranagar",
  "Unnao", "Hugli-Chinsurah", "Alappuzha", "Kottayam", "Machilipatnam", "Shimla", "Adoni", "Udupi", "Tenali",
  "Proddatur", "Saharsa", "Hindupur", "Sasaram", "Buxar", "Krishnanagar", "Fatehabad", "Gudivada", "Bhimavaram",
  "Karaikudi", "Kishanganj", "Pilibhit", "Guntakal", "Srikakulam", "Motihari", "Dharmavaram", "Gudur", "Narasaraopet",
  "Bagaha", "Tadipatri", "Chittoor", "Kavali", "Tadepalligudem", "Amaravati", "Puducherry", "Port Blair",
  "Itanagar", "Dispur", "Gangtok", "Kohima", "Shillong", "Panaji", "Margao", "Dehradun", "Ranchi", "Raipur",
  "Bhopal", "Lucknow", "Patna", "Chandigarh", "Srinagar", "Jammu", "Leh", "Kargil", "Thiruvananthapuram",
  "Kollam", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode",
  "Wayanad", "Kannur", "Kasaragod"
];