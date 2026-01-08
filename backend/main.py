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

app = FastAPI(title="Blog API")

# ==========================
# MongoDB & JWT
# ==========================
MONGO_URI = "mongodb+srv://hamzashakeel219:hamza123@cluster0.hcr7m.mongodb.net/Bloging?retryWrites=true&w=majority"
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

client = MongoClient(MONGO_URI)
db = client["Bloging"]

# ==========================
# ✅ CORS FIX (IMPORTANT)
# ==========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://bloging-hhk25sfjw-hamzas-projects-30a3d32b.vercel.app"
    ],
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
    return pwd_context.hash(password.encode()[:72])

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.encode()[:72], hashed)

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

user_collection = db["user"]

def user_helper(user):
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "contact": user.get("contact"),
        "profileImage": user.get("profileImage"),
        "createdAt": user.get("createdAt"),
    }

# ==========================
# JWT Auth
# ==========================
security = HTTPBearer()

def create_access_token(data: dict):
    data["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        user = user_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**{**user_helper(user), "password": user["password"]})
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==========================
# Auth APIs
# ==========================
@app.post("/signup")
async def signup(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    contact: str = Form(""),
    profileImage: UploadFile = File(None),
):
    if user_collection.find_one({"email": email.lower()}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user = {
        "name": name,
        "email": email.lower(),
        "password": hash_password(password),
        "role": role,
        "contact": contact,
        "profileImage": None,
        "createdAt": datetime.utcnow(),
    }

    if profileImage:
        user["profileImage"] = base64.b64encode(
            await profileImage.read()
        ).decode()

    user_collection.insert_one(user)
    return {"message": "User registered"}

@app.post("/login")
def login(email: str = Body(...), password: str = Body(...)):
    user = user_collection.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_access_token({"user_id": str(user["_id"]), "role": user["role"]})
    return {
        "access_token": token,
        "role": user["role"],
        "userId": str(user["_id"]),
    }

# ==========================
# Posts
# ==========================
post_collection = db["post"]

def post_helper(post):
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "content": post["content"],
        "authorId": post["authorId"],
        "tags": post["tags"],
        "postImage": post.get("postImage"),
        "createdAt": post["createdAt"],
        "updatedAt": post["updatedAt"],
    }

@app.post("/post/create")
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    tags: str = Form(""),
    postImage: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin allowed")

    post = {
        "title": title,
        "content": content,
        "authorId": current_user.id,
        "tags": tags.split(",") if tags else [],
        "postImage": None,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    if postImage:
        post["postImage"] = base64.b64encode(
            await postImage.read()
        ).decode()

    post_collection.insert_one(post)
    return {"message": "Post created"}

@app.get("/post")
def get_posts():
    return [post_helper(p) for p in post_collection.find()]
