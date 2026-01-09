from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64

# ==========================
# App & CORS
# ==========================
app = FastAPI(title="Blog API")

origins = [
    "http://localhost:5173",                 # local dev
    "https://bloging-app-nsy9.vercel.app",  # deployed frontend
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # only allow these origins
    allow_credentials=True,         # needed for Authorization headers
    allow_methods=["*"],            # allow all HTTP methods: GET, POST, PUT, DELETE
    allow_headers=["*"],
)

# ==========================
# MongoDB Connection
# ==========================
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
# Password Hashing
# ==========================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    # Only take first 72 characters
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Only take first 72 characters
    return pwd_context.verify(plain_password[:72], hashed_password)

# ==========================
# User Model
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
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = user_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
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

# ==========================
# Optional auth dependency
# ==========================
from fastapi import Request

async def get_current_user_optional(request: Request):
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth[7:])
        return get_current_user(credentials)
    return None

# ==========================
# Post Helper
# ==========================
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
# Root
# ==========================
@app.get("/")
def root():
    return {"message": "Backend is working"}

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
class LoginModel(BaseModel):
    email: str
    password: str

# -------------------------------
# Routes
# -------------------------------
@app.post("/login")
def login(login: LoginModel):
    try:
        user = user_collection.find_one({"email": login.email.lower()})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(login.password, user["password"]):
            raise HTTPException(status_code=401, detail="Incorrect password")

        token_data = {"user_id": str(user["_id"]), "role": user.get("role", "user")}
        access_token = create_access_token(token_data)

        return {
            "message": "Login successful",
            "access_token": access_token,
            "role": user.get("role", "user"),
            "userId": str(user["_id"]),
            "user": {
                "email": user["email"],
                "name": user.get("name", "")
            }
        }

    except HTTPException as e:
        # Let FastAPI handle it properly
        raise e

    except Exception as e:
        print("Login error:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/user/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    return user_helper(current_user)

@app.put("/user/me")
async def update_my_profile(
    name: str = Form(None),
    password: str = Form(None),
    contact: str = Form(None),
    profileImage: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    if name: update_data["name"] = name
    if password: update_data["password"] = hash_password(password)
    if contact is not None: update_data["contact"] = contact
    if profileImage and profileImage.filename:
        contents = await profileImage.read()
        update_data["profileImage"] = base64.b64encode(contents).decode("utf-8")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    user_collection.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    updated_user = user_collection.find_one({"_id": current_user["_id"]})
    return {"message": "Profile updated successfully", "user": user_helper(updated_user)}
# ==========================
# Post Endpoints
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

@app.get("/post")
def display_posts(current_user: Optional[User] = Depends(get_current_user_optional)):
    if current_user:
        user_posts = post_collection.find({"authorId": current_user.id})
        return [post_helper(p) for p in user_posts]
    return [post_helper(p) for p in post_collection.find()]

@app.put("/post/{post_id}")
async def update_post(
    post_id: str,
    title: str = Form(None),
    content: str = Form(None),
    tags: str = Form(None),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user)
):
    post = post_collection.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if current_user.role != "admin" and post["authorId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to update this post")
    update_data = {}
    if title: update_data["title"] = title
    if content: update_data["content"] = content
    if tags: update_data["tags"] = [t.strip() for t in tags.split(",")]
    if postImage and postImage.filename:
        contents = await postImage.read()
        update_data["postImage"] = base64.b64encode(contents).decode("utf-8")
    update_data["updatedAt"] = datetime.utcnow()
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    post_collection.update_one({"_id": ObjectId(post_id)}, {"$set": update_data})
    updated_post = post_collection.find_one({"_id": ObjectId(post_id)})
    return {"message": "Post updated", "post": post_helper(updated_post)}

@app.delete("/post/{post_id}")
def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    post = post_collection.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if current_user.role != "admin" and post["authorId"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")
    post_collection.delete_one({"_id": ObjectId(post_id)})
    return {"message": "Post deleted successfully"}
