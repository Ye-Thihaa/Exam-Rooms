# 🎓 Exam Room Generator

**Automated Seating Plan & Invigilator Assignment System**

---

## 📌 Overview

The **Exam Room Generator** automates the creation of exam seating plans and teacher (invigilator) assignments. It ensures fair seat distribution, avoids subject conflicts, and reduces manual errors—making exam management faster, accurate, and reliable.

---

## ✨ Features

- 🪑 **Automatic seating plan generation**
- 🏫 **Supports multiple exam rooms and capacities**
- 🔄 **Prevents same-semester / same-subject side-by-side seating**
- 👨‍🏫 **Automatic invigilator assignment**
- 🚫 **Avoids teacher–subject conflicts**
- ⚖️ **Balanced teacher distribution**

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React + ShadCn UI |
| **Backend** | Supabase |
| **Database** | Supabase |
| **Tools** | Git, GitHub |

---

## 🔄 System Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                          START                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Input Student Data     │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │ Input Exam Room Details │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Input Teacher Data     │
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │  Validate Constraints   │
         └────────┬───────┬────────┘
                  │       │
            Valid │       │ Invalid
                  │       │
                  ▼       ▼
    ┌──────────────────┐  └──────► (Return to Input Student Data)
    │ Generate Seating │
    │      Plan        │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Assign           │
    │ Invigilators     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  Conflict Check  │
    └────┬───────┬─────┘
         │       │
No Conflict     Conflict Found
         │       │
         ▼       └──────► (Return to Assign Invigilators)
    ┌──────────────────┐
    │ Generate Final   │
    │     Output       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │       END        │
    └──────────────────┘
```

---

## 🧠 How It Works

1. **Collects Data**: Student information, room details, and teacher availability
2. **Applies Rules**: Enforces seating and invigilation constraints
3. **Generates Plan**: Creates a conflict-free seating arrangement
4. **Assigns Teachers**: Matches suitable invigilators to each room
5. **Produces Output**: Delivers the final exam arrangement ready for use

---

## 🧩 Handling Retake / Cross-Semester Seating

When students **retake** exams across semesters, matching seats by only `year/semester/program/specialization` can place them into dates they do not actually attend. A reliable fix is to **separate “room assignment” from “exam session participation.”**

### ✅ Recommended data model adjustment

1. **Create an exam session table** (one row per actual date/time):
   - `exam_session` → `{ session_id, exam_id, exam_date, start_time, end_time, room_id }`
2. **Create a student–session mapping**:
   - `student_exam_session` → `{ student_id, session_id, attempt_type }`
     - `attempt_type`: `regular | retake`

This allows you to keep rooms “available for a schedule range” while still generating **seats for only the students who truly attend each date**.

### ✅ Seating generation logic

1. Find all sessions in a room on a date.
2. For each session, pull students from `student_exam_session`.
3. Generate seating only for those students (including retake cases).

This avoids the edge case where a **retaker (Sem A) is assigned into a Sem B date** simply because the group rules matched.

---

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| ⏱️ **Time Saving** | Automates hours of manual planning work |
| ❌ **Error Reduction** | Eliminates common human mistakes |
| 🔍 **Transparency** | Fair and auditable allocation process |
| 📊 **Scalability** | Handles large-scale examinations efficiently |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Supabase account
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Ye-Thihaa/Exam-Rooms

# Navigate to project directory
cd Exam-rooms

# Install dependencies
npm install

# Set up environment variables
cp .env
# Add your Supabase credentials to .env

# Run the application
npm run dev
```

---

## 📝 Usage

1. **Input student data** with semester and subject information
2. **Configure exam rooms** with capacity details
3. **Add teacher data** with subject expertise
4. **Generate the plan** and review assignments
5. **Export or print** the final seating arrangement

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for better exam management**
