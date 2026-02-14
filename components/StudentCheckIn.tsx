import React, { useEffect, useState } from 'react';
import { gun, APP_NAMESPACE } from '../services/gunService';
import { Student } from '../types';
import { MapPin, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const StudentCheckIn: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [adminPub, setAdminPub] = useState<string | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Parse Hash Parameters
    // URL format: #/checkin?session=123&pub=ABC
    const hash = window.location.hash;
    const queryString = hash.split('?')[1];
    const urlParams = new URLSearchParams(queryString);
    
    const sId = urlParams.get('session');
    const pub = urlParams.get('pub');

    if (!sId || !pub) {
      setError("Invalid QR Code. Missing session details.");
      setLoading(false);
      return;
    }

    setSessionId(sId);
    setAdminPub(pub);

    if (!gun) {
      setError("System error: Database not initialized.");
      setLoading(false);
      return;
    }

    // Fetch Class List from Admin's public key
    // Using map().once() because roster changes are rare during check-in
    gun.get(`~${pub}`).get(APP_NAMESPACE).get('class_list').map().once((data: any) => {
       if (data && data.name && !data._tombstone) {
         setStudents(prev => {
            if (prev.find(s => s.id === data.studentId)) return prev;
            return [...prev, { id: data.studentId, name: data.name }];
         });
       }
    });

    // Subscribe to session status
    // Use .on() so if the admin stops the session while student is here, they know immediately
    const sessionSub = gun.get(`~${pub}`).get(APP_NAMESPACE).get('active_session').on((data: any) => {
        if (!data || data.sessionId !== sId || !data.active) {
            setError("This session has ended.");
        }
        // First load complete
        setLoading(false);
    });

    return () => {
      // Clean up subscription if possible (Gun doesn't always make this easy without 'off', but React unmount handles refs)
      // sessionSub.off(); // Gun types are loose here, omitting for safety
    };

  }, []);

  const getGeoLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationError(null);
      },
      (err) => {
        console.warn("Location access denied", err);
        setLocationError("Location access required for attendance.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  useEffect(() => {
    // Attempt to get location on load
    getGeoLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !sessionId || !adminPub) return;
    
    // Enforce location if required
    if (!location) {
      getGeoLocation();
      alert("Please allow location access to check in.");
      return;
    }

    setSubmitting(true);

    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const record = {
      studentId: student.id,
      name: student.name,
      timestamp: Date.now(),
      latitude: location.lat,
      longitude: location.lng
    };

    // Write to the PUBLIC shared attendance node for this session.
    gun.get(APP_NAMESPACE).get('sessions').get(sessionId).get('attendance').get(student.id).put(record, (ack: any) => {
      if (ack.err) {
        setError("Failed to submit attendance. Connection error.");
        setSubmitting(false);
      } else {
        setSuccess(true);
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full border-t-4 border-red-500">
           <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold text-gray-800 mb-2">Session Error</h2>
           <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen p-6 bg-green-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full border-t-4 border-green-500">
           <div className="animate-bounce">
             <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Checked In!</h2>
           <p className="text-gray-600">Your attendance has been recorded.</p>
           <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-500">
              ID: {selectedStudentId}<br/>
              Loc: {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
           </div>
           <p className="text-sm text-gray-400 mt-4">You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-indigo-700 opacity-10 transform -skew-y-6 origin-top-left"></div>
          <h1 className="text-xl font-bold text-white relative z-10">Student Check-In</h1>
          <p className="text-indigo-200 text-sm mt-1 relative z-10">Mark your presence</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Who are you?</label>
            <div className="relative">
              <select
                required
                className="w-full border-2 border-gray-200 rounded-lg p-3 bg-white focus:border-indigo-500 focus:outline-none transition-colors appearance-none"
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
              >
                <option value="">-- Select your name --</option>
                {students.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            {students.length === 0 && (
              <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching class roster...
              </p>
            )}
          </div>

          <div className={`p-4 rounded-lg flex items-start gap-3 border ${locationError ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
             <MapPin className={`w-5 h-5 mt-0.5 ${locationError ? 'text-red-500' : 'text-blue-500'}`} />
             <div className="text-sm">
               <p className={`font-medium ${locationError ? 'text-red-700' : 'text-blue-700'}`}>
                 Location Status
               </p>
               {location ? (
                 <p className="text-blue-600 text-xs">
                   Acquired: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                 </p>
               ) : (
                 <p className={`${locationError ? 'text-red-600' : 'text-blue-500'} text-xs`}>
                   {locationError || 'Detecting location...'}
                 </p>
               )}
               {locationError && (
                 <button type="button" onClick={getGeoLocation} className="text-xs underline text-red-700 mt-1">
                   Retry GPS
                 </button>
               )}
             </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedStudentId || !location}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.98] shadow-md flex justify-center items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Confirm Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentCheckIn;