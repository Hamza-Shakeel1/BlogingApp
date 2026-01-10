from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64
from bson.errors import InvalidId

# ==========================
# App & MongoDB
# ==========================
app = FastAPI(title="Blog API")

MONGO_URI = "mongodb+srv://hamzashakeel219:hamza123@cluster0.hcr7m.mongodb.net/Bloging?retryWrites=true&w=majority"
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print("❌ MongoDB connection failed:", e)
    client = None

db = client["Bloging"] if client else None
user_collection = db["user"]
post_collection = db["post"]

# ==========================
# CORS Middleware
# ==========================
origins = [
    "http://localhost:5173",
    "https://bloging-app-nsy9.vercel.app",
    "https://bloging-app-y91u.vercel.app",
    "https://bloging-6cb7uao07-hamzas-projects-30a3d32b.vercel.app" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is working"}

# ==========================
# Password Hashing
# ==========================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password[:72], hashed_password)

# ==========================
# Models
# ==========================
class User(BaseModel):
    id: Optional[str]
    name: str
    email: EmailStr
    password: str
    role: str
    contact: Optional[str] = None
    profileImage: Optional[str] = None
    createdAt: Optional[datetime] = None

class LoginModel(BaseModel):
    email: str
    password: str

# ==========================
# Helpers
# ==========================
def user_helper(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "contact": user.get("contact", ""),
        "profileImage": user.get("profileImage"),
        "createdAt": user.get("createdAt")
    }

def post_helper(post):
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "content": post["content"],
        "authorId": post["authorId"],
        "tags": post.get("tags", []),
        "postImage": post.get("postImage"),
        "createdAt": post.get("createdAt"),
        "updatedAt": post.get("updatedAt")
    }

# ==========================
# JWT Auth
# ==========================
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return User(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        password=user["password"],
        role=user["role"],
        contact=user.get("contact"),
        profileImage=user.get("profileImage"),
        createdAt=user.get("createdAt")
    )

# Optional auth for viewing posts
def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if not user_id:
            return None
        user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        return User(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            password=user["password"],
            role=user["role"],
            contact=user.get("contact"),
            profileImage=user.get("profileImage"),
            createdAt=user.get("createdAt")
        )
    except JWTError:
        return None

# ==========================
# User Endpoints
# ==========================
@app.get("/user")
def get_users():
    return [user_helper(u) for u in user_collection.find()]

@app.post("/signup")
async def signup(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    contact: str = Form(""),
    profileImage: UploadFile = File(None)
):
    email = email.lower().strip()
    if user_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    hashed = hash_password(password)
    user_dict = {
        "name": name,
        "email": email,
        "password": hashed,
        "role": role,
        "contact": contact,
        "profileImage": None,
        "createdAt": datetime.utcnow()
    }
    if profileImage and profileImage.filename:
        contents = await profileImage.read()
        user_dict["profileImage"] = base64.b64encode(contents).decode("utf-8")
    result = user_collection.insert_one(user_dict)
    new_user = user_collection.find_one({"_id": result.inserted_id})
    return {"message": "User registered successfully", "user": user_helper(new_user)}

@app.post("/login")
def login(login: LoginModel):
    user = user_collection.find_one({"email": login.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    token_data = {"user_id": str(user["_id"]), "role": user.get("role", "user")}
    access_token = create_access_token(token_data)
    return {
        "message": f"Logged in as {user['role']}",
        "access_token": access_token,
        "role": user.get("role", "user"),
        "userId": str(user["_id"])
    }

@app.get("/user/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return user_helper({
        "_id": ObjectId(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "contact": current_user.contact,
        "profileImage": current_user.profileImage,
        "createdAt": current_user.createdAt
    })

# ==========================
# Public Post Endpoint
# ==========================
@app.get("/post")
def display_posts():
    """Everyone can see all posts"""
    posts = post_collection.find()
    return [post_helper(p) for p in posts]

# ==========================
# Admin-only Post Creation
# ==========================
@app.post("/post/create")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create posts")
    post_dict = {
        "title": title,
        "content": content,
        "authorId": current_user.id,
        "tags": [t.strip() for t in tags.split(",")] if tags else [],
        "postImage": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    if postImage and postImage.filename:
        contents = await postImage.read()
        post_dict["postImage"] = base64.b64encode(contents).decode("utf-8")
    result = post_collection.insert_one(post_dict)
    new_post = post_collection.find_one({"_id": result.inserted_id})
    return {"message": "Post created", "post": post_helper(new_post)}

# ==========================
# Update Post
# ==========================
@app.put("/post/{post_id}")
async def update_post(
    post_id: str,
    title: str = Form(None),
    content: str = Form(None),
    tags: str = Form(None),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = post_collection.find_one({"_id": obj_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if str(post["authorId"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only update your own posts")

    update_data = {}
    if title: update_data["title"] = title
    if content: update_data["content"] = content
    if tags: update_data["tags"] = [t.strip() for t in tags.split(",")]
    if postImage and postImage.filename:
        contents = await postImage.read()
        update_data["postImage"] = base64.b64encode(contents).decode("utf-8")
    update_data["updatedAt"] = datetime.utcnow()

    post_collection.update_one({"_id": obj_id}, {"$set": update_data})
    updated_post = post_collection.find_one({"_id": obj_id})
    return {"message": "Post updated", "post": post_helper(updated_post)}

# ==========================
# Delete Post
# ==========================
@app.delete("/post/{post_id}")
def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = post_collection.find_one({"_id": obj_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if str(post["authorId"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    post_collection.delete_one({"_id": obj_id})
    return {"message": "Post deleted successfully"}



@app.get("/post")
def display_posts(current_user: User = Depends(get_current_user)):
    # Fetch only posts created by this user
    user_posts = post_collection.find({"authorId": current_user.id})
    return [post_helper(p) for p in user_posts]