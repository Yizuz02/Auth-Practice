const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running and connected to Supabase." });
});

app.get("/public/info", (req, res) => {
    res.json({ message: "Welcome stranger! This info is public." });
});

app.get("/protected/profile", (req, res) => {
    const authheader = req.headers.authorization;
    const regex = /^Bearer\s+(.+)$/i; 
    console.log(authheader);
    if (!authheader || !authheader.match(regex)){
        return res.status(401).send({ "error": "Access token required" });
    }
    res.json({ message: "" });
});

app.post("/auth/signup", async (req, res) => {
    const { email, password } = req.body;
    if (!email){
        return res.status(400).send({ "error": "Email is required" });
    }
    if (!password){
        return res.status(400).send({ "error": "Password is required" });
    }
    
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    })

    if (error || !data.user) {
        return res.status(400).send({ "error": error.message });
    }

    res.status(201).send(data.user);
});

app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email){
        return res.status(400).send({ "error": "Email is required" });
    }
    if (!password){
        return res.status(400).send({ "error": "Password is required" });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })

    if (error || !data.session) {
        res.status(401).send({ "error": "Invalid login credentials" });
    }

    res.status(200).send({
        "access_token": data.session.access_token,
        "refresh_token": data.session.refresh_token
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});