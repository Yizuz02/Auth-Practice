const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./openapi.json");

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

async function validateUser(req, res, next) {
    const authheader = req.headers.authorization;
    const regex = /^Bearer\s+(.+)$/i; 
    if (!authheader || !authheader.match(regex)){
        return res.status(401).send({ "error": "Access token required" });
    }
    const token = authheader.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user){
        return res.status(401).send({ "error": "Invalid or expired token" });
    }
    req.user = user;
    next();
}

app.get("/protected/profile", validateUser, (req, res) => {
    const user = req.user;
    res.json({
        "id": user.id, 
        "email": user.email, 
        "created_at": user.created_at
    });
});

app.post("/auth/logout", validateUser, async (req, res) => {
    const { error } = await supabase.auth.signOut()
    if (error){
        return res.status(400).send({ "error": error.message });
    }
    res.status(204).send();
});

// Middleware to ensure the authenticated user has the "admin" role
function validateAdmin(req, res, next) {
    const user = req.user;

    // Check custom role stored in app_metadata or user.role
    const role = user.app_metadata?.role || user.role;

    if (role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    next();
}

// Protected Admin-only endpoint
app.get("/admin/profile", validateUser, validateAdmin, (req, res) => {
    const user = req.user;
    return res.json({
        id: user.id,
        email: user.email,
        role: user.app_metadata?.role || user.role,
        created_at: user.created_at
    });
});


app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});