🎓 Exam Room Generator

Automated Seating Plan & Invigilator Assignment System

📌 Overview

The Exam Room Generator automates the creation of exam seating plans and teacher (invigilator) assignments.
It ensures fair seat distribution, avoids subject conflicts, and reduces manual errors—making exam management faster, accurate, and reliable.

✨ Features

🪑 Automatic seating plan generation

🏫 Supports multiple exam rooms and capacities

🔄 Prevents same-semester / same-subject side-by-side seating

👨‍🏫 Automatic invigilator assignment

🚫 Avoids teacher–subject conflicts

⚖️ Balanced teacher distribution

🛠️ Tech Stack (Example)

Update this section based on your actual implementation

Frontend: React + ShadCn

Backend: Supbabase

Database: Supbabase

Tools: Git, GitHub

🔄 System Flowchart
flowchart TD
A[Start] --> B[Input Student Data]
B --> C[Input Exam Room Details]
C --> D[Input Teacher Data]
D --> E[Validate Constraints]
E -->|Valid| F[Generate Seating Plan]
E -->|Invalid| B
F --> G[Assign Invigilators]
G --> H[Conflict Check]
H -->|No Conflict| I[Generate Final Output]
H -->|Conflict Found| G
I --> J[End]

🧠 How It Works

Collects student, room, and teacher information

Applies seating and invigilation rules

Generates a conflict-free seating plan

Assigns suitable teachers to each room

Produces a final exam arrangement

🎯 Benefits

⏱️ Saves time and manual effort

❌ Eliminates human errors

🔍 Transparent and fair allocation

📊 Suitable for large-scale examinations
