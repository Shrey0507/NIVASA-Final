import { useCallback, useEffect, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";

import { deleteStudent, getStudents } from "@/services/adminService";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StudentForm from "@/components/students/StudentForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
];

const ALL = "all";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [hostel, setHostel] = useState(ALL);
  const [department, setDepartment] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const debouncedSearch = useDebounce(search, 300);

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudents({
        search: debouncedSearch,
        hostel: hostel === ALL ? "" : hostel,
        department: department === ALL ? "" : department,
        status: status === ALL ? "" : status,
      });
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, hostel, department, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setSelected(null);
    setShowForm(true);
  };

  const openEdit = (student) => {
    setSelected(student);
    setShowForm(true);
  };

  const handleFormClose = (saved) => {
    setShowForm(false);
    setSelected(null);
    if (saved) load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        description={
          loading
            ? "Loading residents..."
            : `${students.length} resident${students.length === 1 ? "" : "s"} found`
        }
      >
        <Button onClick={openAdd}>
          <Plus /> Add student
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or USN..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect value={hostel} onChange={setHostel} placeholder="Hostel">
          <SelectItem value={ALL}>All hostels</SelectItem>
          <SelectItem value="boys">Boys' Hostel</SelectItem>
          <SelectItem value="girls">Girls' Hostel</SelectItem>
        </FilterSelect>
        <FilterSelect
          value={department}
          onChange={setDepartment}
          placeholder="Department"
        >
          <SelectItem value={ALL}>All departments</SelectItem>
          {DEPARTMENTS.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </FilterSelect>
        <FilterSelect value={status} onChange={setStatus} placeholder="Status">
          <SelectItem value={ALL}>All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </FilterSelect>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState
              title="Failed to load students"
              description={error}
              action={
                <Button variant="outline" onClick={load}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : students.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={UserPlus}
              title="No students found"
              description="Try adjusting your filters, or add a new resident."
              action={
                <Button onClick={openAdd}>
                  <Plus /> Add student
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>USN</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.hostelType === "boys"
                        ? "Boys' Hostel"
                        : "Girls' Hostel"}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.usn}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>{s.class || "—"}</TableCell>
                  <TableCell>
                    {s.room || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteTarget(s);
                          setDeleteError("");
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <StudentForm
        open={showForm}
        student={selected}
        onClose={handleFormClose}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Remove student"
          description={
            <>
              <p>
                You are about to remove{" "}
                <strong>{deleteTarget.fullName}</strong> ({deleteTarget.usn})
                from the system.
              </p>
              <p>This action cannot be undone.</p>
            </>
          }
          confirmLabel="Remove student"
          variant="destructive"
          loading={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function FilterSelect({ value, onChange, placeholder, children }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="sm:w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
