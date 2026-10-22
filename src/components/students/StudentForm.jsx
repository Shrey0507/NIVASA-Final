import { useEffect, useState } from "react";

import { createStudent, updateStudent } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
];

const EMPTY = {
  fullName: "",
  usn: "",
  department: "",
  class: "",
  semester: "",
  email: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  hostelType: "boys",
};

export default function StudentForm({ open, student, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(student ? { ...EMPTY, ...student } : EMPTY);
  }, [open, student]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    if (!form.usn.trim()) next.usn = "USN is required";
    if (!form.department) next.department = "Department is required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (!/^[0-9]{10}$/.test(form.phone))
      next.phone = "Must be 10 digits";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Invalid email format";
    if (!form.guardianName.trim())
      next.guardianName = "Guardian name is required";
    if (!form.guardianPhone.trim())
      next.guardianPhone = "Guardian phone is required";
    else if (!/^[0-9]{10}$/.test(form.guardianPhone))
      next.guardianPhone = "Must be 10 digits";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      if (student) await updateStudent(student.id, form);
      else await createStudent(form);
      onClose(true);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student ? "Edit student" : "Add new student"}</DialogTitle>
          <DialogDescription>
            {student
              ? "Update the resident's details below."
              : "Register a new resident. Room assignment is handled in the Rooms module."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.fullName}>
              <Input
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Aarav Kumar"
              />
            </Field>
            <Field label="USN" error={errors.usn}>
              <Input
                value={form.usn}
                onChange={(e) => update("usn", e.target.value.toUpperCase())}
                placeholder="1MS22CS001"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" error={errors.department}>
              <Select
                value={form.department || ""}
                onValueChange={(v) => update("department", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class / Year">
              <Input
                value={form.class}
                onChange={(e) => update("class", e.target.value)}
                placeholder="3rd Year"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="student@sjbit.edu.in"
              />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="9876543210"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guardian name" error={errors.guardianName}>
              <Input
                value={form.guardianName}
                onChange={(e) => update("guardianName", e.target.value)}
              />
            </Field>
            <Field label="Guardian phone" error={errors.guardianPhone}>
              <Input
                value={form.guardianPhone}
                onChange={(e) => update("guardianPhone", e.target.value)}
                placeholder="9876543210"
              />
            </Field>
          </div>

          <Field label="Hostel">
            <Select
              value={form.hostelType}
              onValueChange={(v) => update("hostelType", v)}
            >
              <SelectTrigger className="sm:w-1/2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boys">Boys' Hostel</SelectItem>
                <SelectItem value="girls">Girls' Hostel</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : student
                  ? "Update student"
                  : "Add student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
