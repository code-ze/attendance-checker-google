import React, { useState, useEffect } from 'react';
import { user, generateUUID, APP_NAMESPACE, gun } from '../services/gunService';
import { Student, AttendanceRecord, SessionData } from '../types';
import { Download, Users, QrCode, StopCircle, LogOut, Upload } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [importJson, setImportJson] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'session'>('session');

  // Load Class List on Mount
  useEffect(() => {
    if (!user.is) return;

    // We use .map() to get updates for each item in the list
    user.get(APP_NAMESPACE).get('class_list').map().on((data: any, id: string) => {
      if (data && data.name && !data._tombstone) { // Simple soft delete check if we had one
        setStudents((prev) => {
          const exists = prev.find((s) => s.id === data.studentId);
          if (exists) return prev;
          return [...prev, { id: data.studentId, name: data.name }];
        });
      }
    });

    // Check for active session persistence
    user.get(APP_NAMESPACE).get('active_session').on((data: any) => {
      if (data && data.active) {
        setSession({
          sessionId: data.sessionId,
          createdAt: data.createdAt,
          active: data.active
        });
      } else {
        setSession(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Monitor Attendance when session is active
  useEffect(() => {
    if (!session || !session.active) {
      setAttendance([]);
      return;
    }

    const currentAttendance: AttendanceRecord[] = [];
    
    // In a real SEA setup, we would grant certs. 
    // Here, students write to a public node linked to this session, admin listens.
    gun.get(APP_NAMESPACE).get('sessions').get(session.sessionId).get('attendance').map().on((data: any) => {
       if (data && data.studentId) {
          // Avoid duplicates in state
          setAttendance(prev => {
            if (prev.find(a => a.studentId === data.studentId)) return prev;
            return [...prev, {
              studentId: data.studentId,
              name: data.name,
              timestamp: data.timestamp,
              latitude: data.latitude,
              longitude: data.longitude
            }];
          });
       }
    });
    
    // Cleanup listener handled by Gun automatically for map mostly, 
    // but in a complex app we'd use 'off'
  }, [session]);

  const handleAddStudent = () => {
    if (!newStudentId || !newStudentName) return;
    user.get(APP_NAMESPACE).get('class_list').get(newStudentId).put({
      studentId: newStudentId,
      name: newStudentName
    });
    setNewStudentId('');
    setNewStudentName('');
  };

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed)) {
        parsed.forEach((s: any) => {
          if (s.id && s.name) {
            user.get(APP_NAMESPACE).get('class_list').get(s.id).put({
              studentId: s.id,
              name: s.name
            });
          }
        });
        setImportJson('');
        alert(`Imported ${parsed.length} students.`);
      }
    } catch (e) {
      alert("Invalid JSON format. Expected: [{ \"id\": \"1\", \"name\": \"John\" }]");
    }
  };

  const startSession = () => {
    const newSessionId = generateUUID();
    const sessionData = {
      sessionId: newSessionId,
      createdAt: Date.now(),
      active: true
    };
    // Save to Admin's node so they know what's active
    user.get(APP_NAMESPACE).get('active_session').put(sessionData);
    setAttendance([]);
  };

  const stopSession = () => {
    user.get(APP_NAMESPACE).get('active_session').put({ active: false });
  };

  const exportCSV = () => {
    const headers = ["Student ID", "Name", "Time", "Status", "Location"];
    
    // Merge roster with attendance to show absentees
    const fullReport = students.map(student => {
      const record = attendance.find(a => a.studentId === student.id);
      return {
        id: student.id,
        name: student.name,
        time: record ? new Date(record.timestamp).toLocaleTimeString() : "-",
        status: record ? "Present" : "Absent",
        location: record && record.latitude ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}` : "N/A"
      };
    });

    const csvContent = [
      headers.join(","),
      ...fullReport.map(row => `${row.id},"${row.name}",${row.time},${row.status},"${row.location}"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${session?.sessionId || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Construct the URL for the student to scan
  // Note: user.is.pub is the Admin's public key
  const checkInUrl = `${window.location.origin}${window.location.pathname}#/checkin?session=${session?.sessionId}&pub=${user.is.pub}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <QrCode className="w-6 h-6" />
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-4">
           <span className="text-sm opacity-80 hidden md:inline">User: {user.is.alias}</span>
           <button onClick={() => window.location.reload()} className="p-2 hover:bg-indigo-700 rounded-full" title="Logout">
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('session')}
            className={`pb-2 px-1 ${activeTab === 'session' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Session & Attendance
          </button>
          <button 
            onClick={() => setActiveTab('roster')}
            className={`pb-2 px-1 ${activeTab === 'roster' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Class Roster ({students.length})
          </button>
        </div>

        {activeTab === 'session' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Col: Session Control */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">QR Session Control</h2>
              
              {!session?.active ? (
                <div className="text-center py-10">
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-gray-500 mb-6">No active session. Start one to generate a QR code.</p>
                  <button 
                    onClick={startSession}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Start New Session
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-white p-2 border-2 border-gray-200 rounded-lg mb-4">
                    <img src={qrImageUrl} alt="Session QR" className="w-64 h-64 object-contain" />
                  </div>
                  <p className="text-xs text-gray-400 mb-4 font-mono break-all max-w-xs text-center">{session.sessionId}</p>
                  <button 
                    onClick={stopSession}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    <StopCircle className="w-5 h-5" />
                    Stop Session
                  </button>
                  <p className="text-sm text-green-600 mt-4 font-medium animate-pulse">
                    ● Session Live - Monitoring...
                  </p>
                </div>
              )}
            </div>

            {/* Right Col: Live Data */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Live Attendance</h2>
                <div className="flex gap-2 text-sm">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Present: {attendance.length}</span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Absent: {students.length - attendance.length}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4 border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">Time</th>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">Loc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const record = attendance.find(a => a.studentId === student.id);
                      return (
                        <tr key={student.id} className={record ? "bg-green-50" : ""}>
                          <td className="px-4 py-2 font-medium text-gray-800">{student.name}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {record ? new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                             {record?.latitude ? "📍" : ""}
                          </td>
                        </tr>
                      );
                    })}
                    {students.length === 0 && (
                      <tr>
                         <td colSpan={3} className="text-center py-4 text-gray-400">Class roster is empty.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button 
                onClick={exportCSV}
                disabled={!session?.active && attendance.length === 0}
                className="flex items-center justify-center gap-2 w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        )}

        {activeTab === 'roster' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
             <h2 className="text-lg font-semibold mb-6 text-gray-800">Manage Students</h2>
             
             <div className="grid md:grid-cols-2 gap-8">
               <div>
                 <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Add Manually</h3>
                 <div className="space-y-3">
                   <input
                    type="text"
                    placeholder="Student ID (e.g. 101)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newStudentId}
                    onChange={e => setNewStudentId(e.target.value)}
                   />
                   <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                   />
                   <button 
                    onClick={handleAddStudent}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 rounded-md transition-colors"
                   >
                     Add Student
                   </button>
                 </div>
               </div>

               <div>
                 <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Bulk Import (JSON)</h3>
                 <textarea
                   className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   placeholder='[{"id": "1", "name": "Alice"}, {"id": "2", "name": "Bob"}]'
                   value={importJson}
                   onChange={e => setImportJson(e.target.value)}
                 />
                 <button 
                   onClick={handleJsonImport}
                   className="w-full mt-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                 >
                   <Upload className="w-4 h-4" />
                   Import JSON
                 </button>
               </div>
             </div>

             <div className="mt-8">
               <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Current Roster</h3>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {students.map(s => (
                    <div key={s.id} className="bg-gray-50 p-3 rounded border flex items-center gap-2">
                       <div className="bg-indigo-100 text-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold">
                         {s.id}
                       </div>
                       <span className="text-gray-800 font-medium truncate">{s.name}</span>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
