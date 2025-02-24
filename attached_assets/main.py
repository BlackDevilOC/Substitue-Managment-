import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinter.scrolledtext import ScrolledText
import csv
import webbrowser
from urllib.parse import quote

# Global variables
absent_teachers = {}
schedule = {}
all_teachers = set()
substitute_teachers = {}  # Dictionary to store substitute teachers and their phone numbers
substitute_usage = {}
substitution_assignments = {}  # Tracks permanent substitute assignments

# Load the schedule from CSV file
def load_schedule(filename):
    global schedule, all_teachers, substitute_usage, substitution_assignments
    schedule = {}
    all_teachers = set()
    substitute_usage = {}
    substitution_assignments = {}
    try:
        with open(filename, 'r') as file:
            reader = csv.reader(file)
            header = next(reader)
            for row in reader:
                day = row[0].strip().lower()
                period = int(row[1])
                teachers = [teacher.strip().lower() for teacher in row[2:]]
                schedule[day] = schedule.get(day, {})
                schedule[day][period] = teachers
                for teacher in teachers:
                    all_teachers.add(teacher)
        return True
    except FileNotFoundError:
        return False

# Load substitute teachers from CSV file
def load_substitute_teachers(filename):
    global substitute_teachers, substitute_usage, substitution_assignments
    substitute_teachers = {}
    substitute_usage = {}
    substitution_assignments = {}
    try:
        with open(filename, 'r') as file:
            reader = csv.reader(file)
            for row in reader:
                if len(row) >= 2:  # Ensure the row has both name and phone number
                    name = row[0].strip().lower()
                    phone = row[1].strip()
                    substitute_teachers[name] = phone
        return True
    except FileNotFoundError:
        return False

def is_valid_day_period(day, period):
    day = day.strip().lower()
    if day not in schedule:
        return False
    if period not in schedule[day]:
        return False
    return True

def find_teacher(day, period, class_name):
    day = day.strip().lower()
    class_name = class_name.strip().lower()
    valid_classes = ['10a', '10b', '10c', '9a', '9b', '9c', 
                    '8a', '8b', '8c', '7a', '7b', '7c', 
                    '6a', '6b', '6c']

    if not is_valid_day_period(day, period):
        return "Invalid day or period."
    if class_name not in valid_classes:
        return "Invalid class name."

    index = valid_classes.index(class_name)
    original_teacher = schedule[day][period][index]
    assignment_key = (day, period, class_name, original_teacher)

    # Check for existing assignment
    if assignment_key in substitution_assignments:
        assigned_sub = substitution_assignments[assignment_key]
        absent_today = absent_teachers.get(day, [])
        if assigned_sub not in absent_today:
            return f"{original_teacher.title()} (Absent), Substitute: {assigned_sub.title()}"

    if day in absent_teachers and original_teacher in absent_teachers[day]:
        return f"{original_teacher.title()} (Absent), No substitute assigned yet."
    else:
        return original_teacher.title()

def mark_absent():
    selected_teachers = [absent_teacher_listbox.get(i) for i in absent_teacher_listbox.curselection()]
    day = absent_day_combo.get().strip().lower()
    
    if selected_teachers and day:
        if day not in absent_teachers:
            absent_teachers[day] = []
        
        for teacher in selected_teachers:
            if teacher not in absent_teachers[day]:
                absent_teachers[day].append(teacher)
                result_label.config(text=f"{teacher.title()} has been marked as absent on {day.title()}. 🔴", foreground="#d32f2f")
            else:
                result_label.config(text=f"{teacher.title()} is already marked absent on {day.title()}. ⚠️", foreground="#ffa000")
        
        absent_day_combo.set('')
        absent_teacher_listbox.selection_clear(0, tk.END)  # Clear the selection
    else:
        result_label.config(text="Please select at least one teacher and a valid day. ✍️", foreground="#1976d2")

def assign_substitutes():
    for day, absent_list in absent_teachers.items():
        for period, teachers in schedule[day].items():
            for index, teacher in enumerate(teachers):
                if teacher in absent_list:
                    class_name = ['10a', '10b', '10c', '9a', '9b', '9c', '8a', '8b', '8c', '7a', '7b', '7c', '6a', '6b', '6c'][index]
                    assignment_key = (day, period, class_name, teacher)
                    
                    # Check if a substitute is already assigned
                    if assignment_key not in substitution_assignments:
                        current_period_teachers = schedule[day][period]
                        available_teachers = all_teachers - set(current_period_teachers)
                        absent_today = absent_teachers.get(day, [])
                        available_teachers = [t for t in available_teachers if t not in absent_today]
                        available_substitutes = [t for t in substitute_teachers 
                                                if t not in absent_today 
                                                and t not in current_period_teachers]

                        candidates = []
                        if available_substitutes:
                            candidates = sorted(available_substitutes, 
                                              key=lambda x: (substitute_usage.get(x, 0), x))
                        elif available_teachers:
                            candidates = sorted(available_teachers, 
                                              key=lambda x: (substitute_usage.get(x, 0), x))
                        
                        if candidates:
                            substitute = candidates[0]
                            substitute_usage[substitute] = substitute_usage.get(substitute, 0) + 1
                            substitution_assignments[assignment_key] = substitute

    result_label.config(text="Substitutes have been assigned successfully! ✅", foreground="#388e3c")

def on_search():
    day = day_combo.get()
    period = period_combo.get()
    class_name = class_combo.get()
    try:
        period = int(period)
        teacher = find_teacher(day, period, class_name)
        result_label.config(text=f"Teacher: {teacher} 👨‍🏫", foreground="#388e3c")
    except ValueError:
        result_label.config(text="Period must be a number. 🔢", foreground="#d32f2f")

def load_file():
    filename = filedialog.askopenfilename(title="Choose Timetable File", filetypes=[("CSV Files", "*.csv")])
    if filename:
        if load_schedule(filename):
            result_label.config(text="Timetable loaded successfully! ✅", foreground="#388e3c")
            update_combos()
        else:
            result_label.config(text="Error loading timetable. ❌", foreground="#d32f2f")

def load_substitute_file():
    filename = filedialog.askopenfilename(title="Choose Substitute Teachers File", filetypes=[("CSV Files", "*.csv")])
    if filename:
        if load_substitute_teachers(filename):
            result_label.config(text="Substitute teachers loaded successfully! ✅", foreground="#388e3c")
            update_combos()
        else:
            result_label.config(text="Error loading substitute teachers. ❌", foreground="#d32f2f")

def update_combos():
    # Update the listbox with the latest data
    absent_teacher_listbox.delete(0, tk.END)  # Clear the listbox
    for teacher in sorted(all_teachers):
        absent_teacher_listbox.insert(tk.END, teacher)  # Add teachers to the listbox
    sms_teacher_combo['values'] = sorted(substitute_teachers.keys())  # Only substitute teachers' names
    teacher_name_combo['values'] = sorted(all_teachers)  # All teachers for schedule display

def display_teacher_schedule():
    day = export_day_combo.get().strip().lower()
    teacher_name = teacher_name_combo.get().strip().lower()
    if day in schedule:
        teacher_found = False
        schedule_text.delete(1.0, tk.END)
        for period, teachers in schedule[day].items():
            for index, teacher in enumerate(teachers):
                if teacher_name == teacher.lower():
                    class_name = ['10a', '10b', '10c', '9a', '9b', '9c', '8a', '8b', '8c', '7a', '7b', '7c', '6a', '6b', '6c'][index]
                    # Check if the teacher has a substitute assignment
                    assignment_key = (day, period, class_name, teacher)
                    if assignment_key in substitution_assignments:
                        substitute = substitution_assignments[assignment_key]
                        schedule_text.insert(tk.END, f"Period: {period}, Class: {class_name.title()}, Teacher: {teacher.title()} (Covered by: {substitute.title()})\n")
                    else:
                        schedule_text.insert(tk.END, f"Period: {period}, Class: {class_name.title()}, Teacher: {teacher.title()}\n")
                    teacher_found = True
        if not teacher_found:
            result_label.config(text=f"No schedule found for teacher {teacher_name.title()} on {day.title()}. ⚠️", foreground="#ffa000")
        else:
            result_label.config(text=f"Teacher {teacher_name.title()}'s schedule displayed below. 📅", foreground="#388e3c")
    else:
        result_label.config(text="Invalid day. Please try again. ❌", foreground="#d32f2f")

def display_all_teachers_schedule():
    day = all_teachers_day_combo.get().strip().lower()
    if day in schedule:
        schedule_text.delete(1.0, tk.END)
        for period, teachers in schedule[day].items():
            for index, teacher in enumerate(teachers):
                class_name = ['10a', '10b', '10c', '9a', '9b', '9c', '8a', '8b', '8c', '7a', '7b', '7c', '6a', '6b', '6c'][index]
                schedule_text.insert(tk.END, f"Period: {period}, Class: {class_name.title()}, Teacher: {teacher.title()}\n")
        result_label.config(text=f"All teachers' schedule for {day.title()} displayed below. 📅", foreground="#388e3c")
    else:
        result_label.config(text="Invalid day. Please try again. ❌", foreground="#d32f2f")

def display_substitute_coverage():
    # Create a dictionary to count substitutes assigned to each teacher
    substitute_summary = {}
    for assignment_key, substitute in substitution_assignments.items():
        if substitute not in substitute_summary:
            substitute_summary[substitute] = 0
        substitute_summary[substitute] += 1

    # Clear the schedule text and display the summary
    schedule_text.delete(1.0, tk.END)
    if substitute_summary:
        schedule_text.insert(tk.END, "Substitute Coverage Summary:\n\n")
        for substitute, count in substitute_summary.items():
            schedule_text.insert(tk.END, f"{substitute.title()} has to cover {count} classes.\n")
        result_label.config(text="Substitute coverage summary displayed below. 📝", foreground="#388e3c")
    else:
        schedule_text.insert(tk.END, "No substitute assignments found. ✅")
        result_label.config(text="No substitute assignments found. ✅", foreground="#388e3c")

def generate_substitute_sms():
    substitute_name = sms_teacher_combo.get().strip().lower()
    
    if not substitute_name:
        messagebox.showwarning("Input Error", "Please select a substitute teacher.")
        return
    
    # Get the phone number from the substitute_teachers dictionary
    phone_number = substitute_teachers.get(substitute_name)
    
    if not phone_number:
        messagebox.showwarning("Input Error", "No phone number found for the selected substitute teacher.")
        return
    
    # Filter assignments for this substitute teacher
    substitute_assignments = {
        k: v for k, v in substitution_assignments.items() 
        if v.lower() == substitute_name
    }
    
    if not substitute_assignments:
        messagebox.showinfo("No Assignments", 
                          f"No assignments found for substitute {substitute_name.title()}")
        return
    
    # Create SMS message
    message = (
        f"📢 Substitute Assignment Notice\n\n"
        f"Dear {substitute_name.title()},\n\n"
        f"You have been assigned to cover the following classes:\n\n"
    )
    
    for assignment, sub in substitute_assignments.items():
        day, period, class_name, original_teacher = assignment
        message += (
            f"📅 {day.title()}\n"
            f"⏰ Period {period}\n"
            f"🏫 Class {class_name.upper()}\n"
            f"👨🏫 Covering for {original_teacher.title()}\n"
            f"{'-'*30}\n"
        )
    
    message += "\nPlease confirm receipt of this assignment.\nThank you!"
    
    # Create SMS window
    sms_window = tk.Toplevel(root)
    sms_window.title("Substitute Assignment SMS")
    sms_window.geometry("500x450")
    
    # Add text widget
    sms_text = ScrolledText(sms_window, wrap=tk.WORD, width=60, height=20,
                           font=('Arial', 10))
    sms_text.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)
    sms_text.insert(tk.END, f"📱 To: {phone_number}\n\n{message}")
    
    # Function to send SMS
    def send_sms():
        try:
            # Encode message body
            encoded_body = quote(message)
            # Create SMS URI and open default client
            webbrowser.open(f"sms:{phone_number}?body={encoded_body}")
        except Exception as e:
            messagebox.showerror("Sending Failed", f"Could not open SMS client: {str(e)}")
    
    # Function to copy to clipboard
    def copy_to_clipboard():
        root.clipboard_clear()
        root.clipboard_append(sms_text.get(1.0, tk.END))
        messagebox.showinfo("Copied", "Message copied to clipboard!")
    
    # Add buttons
    button_frame = ttk.Frame(sms_window)
    button_frame.pack(pady=5)
    
    send_btn = ttk.Button(button_frame, text="Send SMS", command=send_sms)
    send_btn.pack(side=tk.LEFT, padx=10)
    
    copy_btn = ttk.Button(button_frame, text="Copy Message", command=copy_to_clipboard)
    copy_btn.pack(side=tk.LEFT, padx=10)

# Main window setup
root = tk.Tk()
root.title("Schedulizer App | Substitute Management")
root.geometry("1100x700")
root.resizable(True, True)

# Custom Style
style = ttk.Style()
style.theme_use("clam")
style.configure("TButton", padding=6, relief="flat", background="#1976d2", foreground="white")
style.map("TButton", background=[("active", "#1565c0"), ("pressed", "#0d47a1")])

# Create PanedWindow
paned_window = ttk.PanedWindow(root, orient=tk.HORIZONTAL)
paned_window.pack(fill=tk.BOTH, expand=True)

# Left Frame (File Management)
left_frame = ttk.Frame(paned_window, width=300, relief=tk.RIDGE, padding=10)
right_frame = ttk.Frame(paned_window, width=700, relief=tk.RIDGE, padding=10)
paned_window.add(left_frame, weight=1)
paned_window.add(right_frame, weight=2)

# Left Frame Contents ----------------------------------------------------------
# File Upload Section
upload_frame = ttk.LabelFrame(left_frame, text="File Management", padding=10)
upload_frame.pack(fill=tk.X, pady=5, padx=5)

file_button = ttk.Button(upload_frame, text="Load Timetable", command=load_file)
file_button.pack(pady=5, fill=tk.X)

substitute_button = ttk.Button(upload_frame, text="Load Substitutes", command=load_substitute_file)
substitute_button.pack(pady=5, fill=tk.X)

# Absence Tracking Section
absent_frame = ttk.LabelFrame(left_frame, text="Absence Tracking", padding=10)
absent_frame.pack(fill=tk.X, pady=5, padx=5)

ttk.Label(absent_frame, text="Day:").grid(row=0, column=0, padx=5, pady=2, sticky="w")
absent_day_combo = ttk.Combobox(absent_frame, values=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday'])
absent_day_combo.grid(row=0, column=1, padx=5, pady=2, sticky="ew")

ttk.Label(absent_frame, text="Teacher:").grid(row=1, column=0, padx=5, pady=2, sticky="w")
absent_teacher_listbox = tk.Listbox(absent_frame, selectmode=tk.MULTIPLE, height=5)
absent_teacher_listbox.grid(row=1, column=1, padx=5, pady=2, sticky="ew")

# Add a scrollbar to the listbox
scrollbar = ttk.Scrollbar(absent_frame, orient=tk.VERTICAL, command=absent_teacher_listbox.yview)
scrollbar.grid(row=1, column=2, sticky="ns")
absent_teacher_listbox.config(yscrollcommand=scrollbar.set)

absent_button = ttk.Button(absent_frame, text="Mark Absent", command=mark_absent)
absent_button.grid(row=2, column=0, columnspan=2, pady=5, sticky="ew")

# Assign Substitutes Button
assign_substitutes_button = ttk.Button(absent_frame, text="Assign Substitutes", command=assign_substitutes)
assign_substitutes_button.grid(row=3, column=0, columnspan=2, pady=5, sticky="ew")

# SMS Section
sms_frame = ttk.LabelFrame(left_frame, text="Substitute Notifications", padding=10)
sms_frame.pack(fill=tk.X, pady=5, padx=5)

ttk.Label(sms_frame, text="Substitute Teacher:").grid(row=0, column=0, padx=5, pady=2, sticky="w")
sms_teacher_combo = ttk.Combobox(sms_frame)
sms_teacher_combo.grid(row=0, column=1, padx=5, pady=2, sticky="ew")

sms_button = ttk.Button(sms_frame, text="Generate Assignment SMS", command=generate_substitute_sms)
sms_button.grid(row=1, column=0, columnspan=2, pady=5, sticky="ew")

# Right Frame Contents ---------------------------------------------------------
# Header
header_frame = ttk.Frame(right_frame)
header_frame.pack(pady=(5, 10))

# Company Name
company_name_label = ttk.Label(header_frame, 
                              text="I madeEZ", 
                              font=('Helvetica', 14, 'bold'), 
                              foreground="#1976d2")
company_name_label.pack(side=tk.LEFT, padx=5)

# App Name
app_name_label = ttk.Label(header_frame, 
                          text="Schedulizer", 
                          font=('Helvetica', 14, 'bold'), 
                          foreground="#1976d2")
app_name_label.pack(side=tk.LEFT, padx=5)

# Slogan
slogan_label = ttk.Label(header_frame, 
                         text="Stay Organized, Stay Ahead", 
                         font=('Helvetica', 12, 'italic'), 
                         foreground="#1976d2")
slogan_label.pack(side=tk.LEFT, padx=5)

# Search Section
search_frame = ttk.LabelFrame(right_frame, text="Teacher Lookup", padding=10)
search_frame.pack(fill=tk.X, pady=5, padx=5)

ttk.Label(search_frame, text="Day:").grid(row=0, column=0, padx=5, pady=2, sticky="w")
day_combo = ttk.Combobox(search_frame, values=['monday', 'tuesday', 'wednesday', 'thursday', 'friday','saturday'])
day_combo.grid(row=0, column=1, padx=5, pady=2)

ttk.Label(search_frame, text="Period:").grid(row=0, column=2, padx=5, pady=2, sticky="w")
period_combo = ttk.Combobox(search_frame, values=[1, 2, 3, 4, 5, 6, 7, 8])
period_combo.grid(row=0, column=3, padx=5, pady=2)

ttk.Label(search_frame, text="Class:").grid(row=0, column=4, padx=5, pady=2, sticky="w")
class_combo = ttk.Combobox(search_frame, values=['10a', '10b', '10c', '9a', '9b', '9c', '8a', '8b', '8c', '7a', '7b', '7c', '6a', '6b', '6c'])
class_combo.grid(row=0, column=5, padx=5, pady=2)

search_button = ttk.Button(search_frame, text="Search", command=on_search)
search_button.grid(row=0, column=6, padx=10, pady=2, sticky="e")

# Schedule Display Section
display_frame = ttk.LabelFrame(right_frame, text="Schedule Management", padding=10)
display_frame.pack(fill=tk.BOTH, expand=True, pady=5, padx=5)

# Teacher Schedule Controls
teacher_controls = ttk.Frame(display_frame)
teacher_controls.grid(row=0, column=0, columnspan=2, sticky="ew", pady=5)

ttk.Label(teacher_controls, text="Teacher:").pack(side=tk.LEFT, padx=5)
teacher_name_combo = ttk.Combobox(teacher_controls, width=20)
teacher_name_combo.pack(side=tk.LEFT, padx=5)

ttk.Label(teacher_controls, text="Day:").pack(side=tk.LEFT, padx=5)
export_day_combo = ttk.Combobox(teacher_controls, values=['monday', 'tuesday', 'wednesday', 'thursday', 'friday','saturday'], width=10)
export_day_combo.pack(side=tk.LEFT, padx=5)

export_teacher_button = ttk.Button(teacher_controls, text="Show Schedule", 
                                  command=display_teacher_schedule)
export_teacher_button.pack(side=tk.LEFT, padx=5)

# Add a new button for displaying substitute coverage
substitute_coverage_button = ttk.Button(teacher_controls, text="Show Substitute Coverage", 
                                       command=display_substitute_coverage)
substitute_coverage_button.pack(side=tk.LEFT, padx=5)

# All Teachers Controls
all_teachers_controls = ttk.Frame(display_frame)
all_teachers_controls.grid(row=1, column=0, columnspan=2, sticky="ew", pady=5)

ttk.Label(all_teachers_controls, text="Day for All Teachers:").pack(side=tk.LEFT, padx=5)
all_teachers_day_combo = ttk.Combobox(all_teachers_controls, values=['monday', 'tuesday', 'wednesday', 'thursday', 'friday','saturday'], width=10)
all_teachers_day_combo.pack(side=tk.LEFT, padx=5)

all_teachers_button = ttk.Button(all_teachers_controls, text="Show All", 
                                command=display_all_teachers_schedule)
all_teachers_button.pack(side=tk.LEFT, padx=5)

# Schedule Text Display
schedule_text = ScrolledText(display_frame, wrap=tk.WORD, width=70, height=15,
                            font=('Consolas', 10))
schedule_text.grid(row=2, column=0, columnspan=2, padx=5, pady=5, sticky="nsew")

# Result Label
result_label = ttk.Label(
    right_frame,
    text="Ready for input...",
    font=('Helvetica', 10, 'italic'),
    wraplength=500
)
result_label.pack(pady=5)

# Configure grid weights
display_frame.columnconfigure(0, weight=1)
display_frame.rowconfigure(2, weight=1)

root.mainloop()