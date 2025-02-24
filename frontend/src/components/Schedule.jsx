import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';

const localizer = momentLocalizer(moment);
const SLOT_MENU_ID = 'calendar-context-menu'; // For all right-clicks

// Create the drag-and-drop-enabled Calendar component
const DnDCalendar = withDragAndDrop(Calendar);

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [clients, setClients] = useState([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false); // For Schedule Appointment dialog (renamed for clarity)
  const [editDialogOpen, setEditDialogOpen] = useState(false); // For Edit Appointment dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false); // For Delete Confirmation dialog
  const [selectedSlot, setSelectedSlot] = useState(null); // For left-click/double-click on empty slots
  const [selectedSlots, setSelectedSlots] = useState([]); // For left-click highlighting
  const [selectedEvent, setSelectedEvent] = useState(null); // For selecting/appointment editing
  const [form, setForm] = useState({ client_id: '', appointment_time: '', duration: '', description: '' });
  const [editForm, setEditForm] = useState({ client_id: '', appointment_time: '', end_time: '', description: '' }); // For editing appointments
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // Track drag state to prevent slot selection
  const [highlightedDay, setHighlightedDay] = useState(null); // Track the highlighted day from month view
  const [currentView, setCurrentView] = useState(Views.WEEK); // Track the current view
  const calendarRef = useRef(null); // Ref for the calendar DOM element

  const { show: showMenu } = useContextMenu({
    id: SLOT_MENU_ID,
  });

  useEffect(() => {
    fetchClients();
    fetchSchedules();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/clients');
      setClients(res.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients.');
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedules');
      const formattedSchedules = res.data.map(schedule => ({
        id: schedule.id,
        title: `${schedule.client_name} - ${schedule.description || 'No description'}`,
        start: new Date(schedule.appointment_time),
        end: schedule.end_time ? new Date(schedule.end_time) : null,
        client_id: schedule.client_id, // Ensure client_id is included from the backend response
      }));
      setSchedules(formattedSchedules);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to load schedules.');
    }
  };

  // Handle left-click slot selection (clear selected appointment, only if not dragging)
  const handleSelectSlot = ({ start, end, action, slots }, e) => {
    setIsDragging(false); // Clear isDragging when a new slot is clicked
    console.log('Handle select slot:', { start, end, action, slots, event: e, selectedEvent, selectedSlot, selectedSlots, isDragging: false, currentView }); // Debug slot selection with full state, showing isDragging reset and currentView
    if (!isDragging) { // Only handle slot selection if not dragging
      if (currentView === Views.MONTH) {
        // Highlight the day in month view (single click)
        setHighlightedDay(moment(start).startOf('day').toDate());
        console.log('Highlighted day in month view:', moment(start).format('YYYY-MM-DD'));
        return; // Exit early to prevent slot range selection in month view
      }

      // Handle left-click (single click) for slot selection in week/day views
      // Always clear selectedEvent and update selectedSlot/selectedSlots, even if previously selected
      setSelectedEvent(null); // Clear selected appointment when clicking an empty slot
      const duration = moment(end).diff(moment(start), 'minutes');
      const formattedStart = moment(start).format('YYYY-MM-DDTHH:mm');
      setForm(prevForm => ({
        ...prevForm,
        appointment_time: formattedStart,
        duration: duration.toString(),
      }));

      const slotRange = [];
      let current = moment(start);
      while (current.isBefore(end)) {
        slotRange.push(current.toDate());
        current.add(30, 'minutes');
      }
      if (action === 'doubleClick') {
        setScheduleDialogOpen(true); // Open Schedule Appointment dialog for empty slots
      }
      setSelectedSlots(slotRange);
      setSelectedSlot({ start, end }); // Set the selected slot for right-click consistency
      console.log('Left-click selected slots (cleared appointment):', { start, end, slotRange, selectedEvent: null, selectedSlot, selectedSlots, isDragging: false });
    } else {
      console.log('Slot selection ignored during drag:', { start, end, isDragging });
    }
  };

  // Handle left-click on an appointment (event, only if not dragging)
  const handleSelectEvent = (event, e) => {
    if (!isDragging) { // Only handle event selection if not dragging
      console.log('Event interaction detected:', { event, type: e?.type, selectedEvent, selectedSlot, selectedSlots, isDragging }); // Simplified debugging
      if (e && e.type === 'click') { // Left-click to select the appointment
        setSelectedEvent(event);
        console.log('Appointment selected (left-click):', event);
      }
    } else {
      console.log('Event selection ignored during drag:', { event, isDragging });
    }
  };

  // Handle double-click on events or slots
  const handleDoubleClickEvent = (eventOrSlot) => {
    console.log('Double-click detected:', { eventOrSlot, selectedEvent, selectedSlot, isDragging, currentView });
    if (!isDragging) { // Only handle double-click if not dragging
      if (eventOrSlot.start && eventOrSlot.end && !eventOrSlot.id && !eventOrSlot.title) { // This is an empty slot (has start/end but no id or title)
        if (currentView === Views.MONTH) {
          setSelectedSlot({ start: moment(eventOrSlot.start).startOf('day').toDate(), end: moment(eventOrSlot.start).endOf('day').toDate() });
        } else {
          setSelectedSlot({ start: eventOrSlot.start, end: eventOrSlot.end });
        }
        setScheduleDialogOpen(true); // Open Schedule Appointment dialog for empty slots
        console.log('Double-clicked empty slot, opening Schedule Appointment dialog:', { start: eventOrSlot.start, end: eventOrSlot.end });
      } else if (eventOrSlot.id && eventOrSlot.title) { // This is an appointment (has id and title)
        setSelectedEvent(eventOrSlot);
        setEditForm({
          client_id: eventOrSlot.client_id || '', // Use the client_id from the selected event to pre-select
          appointment_time: moment(eventOrSlot.start).format('YYYY-MM-DDTHH:mm'),
          end_time: eventOrSlot.end ? moment(eventOrSlot.end).format('YYYY-MM-DDTHH:mm') : '',
          description: eventOrSlot.description || '',
        });
        setEditDialogOpen(true); // Open Edit Appointment dialog for appointments
        console.log('Double-clicked appointment, opening Edit Appointment dialog:', eventOrSlot);
      }
    } else {
      console.log('Double-click ignored during drag:', { eventOrSlot, isDragging });
    }
  };

  // Handle right-click on the calendar (no slot time change, based on selectedEvent state)
  const handleContextMenu = (event) => {
    event.preventDefault();
    const calendarElement = event.currentTarget;
    const rect = calendarElement.getBoundingClientRect();
    
    console.log('Right-click detected on calendar:', { x: event.clientX, y: event.clientY, selectedEvent, selectedSlot, selectedSlots, isDragging });
    
    // Clear selectedSlot when right-clicking to ensure only appointment or slot menu appears
    setSelectedSlot(null);
    
    // Ensure selectedEvent is correctly set for the context menu
    // If no appointment is selected but one was clicked, try to infer from the event
    let inferredEvent = selectedEvent;
    if (!inferredEvent) {
      const target = event.target.closest('.rbc-event');
      if (target) {
        const eventId = target.getAttribute('data-event-id');
        const clickedEvent = schedules.find(e => e.id === parseInt(eventId));
        if (clickedEvent) {
          inferredEvent = clickedEvent;
          setSelectedEvent(clickedEvent); // Update state for consistency
          console.log('Inferred selected event from right-click:', clickedEvent);
        }
      } else {
        // If no appointment is clicked, ensure selectedEvent is cleared for empty slots
        setSelectedEvent(null);
      }
    }

    // Determine if an appointment is involved for the context menu
    const hasAppointment = !!inferredEvent;

    const position = {
      x: event.clientX - rect.left, // Relative to calendar’s left edge
      y: event.clientY - rect.top + 50,  // Relative to calendar’s top edge, with +50 adjustment
    };

    showMenu({
      event,
      position,
    });
  };

  // Open dialog when "Schedule Client" is selected (double-click on empty slot or right-click on empty slot)
  const handleScheduleClient = () => {
    if (selectedSlot) {
      setScheduleDialogOpen(true); // Open Schedule Appointment dialog
    } else {
      // Fallback to a default slot if no slot is selected
      const defaultStart = new Date();
      const defaultEnd = moment(defaultStart).add(30, 'minutes').toDate();
      setSelectedSlot({ start: defaultStart, end: defaultEnd });
      setScheduleDialogOpen(true);
      console.log('Using default slot for scheduling:', { defaultStart, defaultEnd, isDragging });
    }
  };

  // Edit appointment when "Edit Appointment" is selected (right-click when an appointment is selected)
  const handleEditAppointment = () => {
    if (selectedEvent) {
      setEditForm({
        client_id: selectedEvent.client_id || '', // Use the client_id from the selected event to pre-select
        appointment_time: moment(selectedEvent.start).format('YYYY-MM-DDTHH:mm'),
        end_time: selectedEvent.end ? moment(selectedEvent.end).format('YYYY-MM-DDTHH:mm') : '',
        description: selectedEvent.description || '',
      });
      setEditDialogOpen(true); // Open Edit Appointment dialog
      console.log('Opening Edit Appointment dialog from context menu:', selectedEvent);
    } else {
      setError('No appointment selected for editing.');
      console.log('Error: No appointment selected for editing.');
    }
  };

  // Delete appointment when "Delete Appointment" is selected or Delete key is pressed (with confirmation)
  const handleDeleteAppointment = async () => {
    if (!selectedEvent || !selectedEvent.id) {
      setError('No appointment selected for deletion.');
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/schedules/${selectedEvent.id}`);
      await fetchSchedules(); // Refresh the calendar
      setError(null);
      console.log('Appointment deleted successfully:', selectedEvent.id);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError('Failed to delete appointment.');
    }
  };

  // Handle Delete key press to trigger deletion with confirmation
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Delete' && selectedEvent && !isDragging) {
      event.preventDefault(); // Prevent default browser behavior
      setDeleteConfirmOpen(true); // Show confirmation dialog
      console.log('Delete key pressed, showing confirmation for:', selectedEvent);
    }
  }, [selectedEvent, isDragging]);

  // Effect to add and remove keypress listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress); // Cleanup on unmount
  }, [handleKeyPress]);

  // Submit appointment from Schedule Appointment dialog (double-click on empty slot)
  const handleScheduleSubmit = async () => {
    if (!form.client_id) {
      setError('Please select a client.');
      return;
    }
    try {
      const startTime = moment(selectedSlot.start).format('YYYY-MM-DDTHH:mm:ss');
      const endTime = selectedSlot.end ? moment(selectedSlot.end).format('YYYY-MM-DDTHH:mm:ss') : null;
      const payload = {
        client_id: form.client_id,
        appointment_time: startTime,
        end_time: endTime,
        description: form.description,
      };
      await axios.post('http://localhost:5000/api/schedules', payload);
      await fetchSchedules();
      setScheduleDialogOpen(false);
      setForm({ client_id: '', appointment_time: '', duration: '', description: '' });
      setSelectedSlot(null);
      setSelectedSlots([]); // Clear left-click highlights after scheduling
      setError(null);
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      setError('Failed to schedule appointment.');
    }
  };

  // Handle saving changes in Edit Appointment dialog
  const handleEditSubmit = async () => {
    if (!editForm.client_id || !editForm.appointment_time) {
      setError('Client and appointment time are required.');
      return;
    }
    try {
      const startTime = moment(editForm.appointment_time).format('YYYY-MM-DDTHH:mm:ss');
      const endTime = editForm.end_time ? moment(editForm.end_time).format('YYYY-MM-DDTHH:mm:ss') : null;
      const payload = {
        client_id: editForm.client_id, // Ensure client_id is always included in the PUT request
        appointment_time: startTime,
        end_time: endTime,
        description: editForm.description,
      };
      console.log('Sending edit payload:', payload); // Debug the payload being sent
      await axios.put(`http://localhost:5000/api/schedules/${selectedEvent.id}`, payload);
      await fetchSchedules(); // Refresh the calendar
      setEditDialogOpen(false);
      setEditForm({ client_id: '', appointment_time: '', end_time: '', description: '' });
      setSelectedEvent(null);
      setError(null);
      console.log('Appointment updated successfully:', selectedEvent.id);
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment. ' + (err.response ? err.response.data.error : err.message));
    }
  };

  // Handle dragging and moving appointments to different time slots or days
  const handleEventDrop = async ({ event, start, end, allDay }) => {
    console.log('Attempting to move appointment (drop):', { event, start, end, allDay, isDragging, selectedEvent, selectedSlot, selectedSlots });
    try {
      // Use the new start and end values by default, but check allDay for row format adjustments
      let updatedStart = start;
      let updatedEnd = end;

      // Only preserve times for allDay events in row format (month view or multi-day events)
      if (allDay && (moment(end).diff(moment(start), 'days') > 1 || moment().isSame(moment(start), 'month'))) {
        const originalStart = moment(event.start);
        const originalEnd = moment(event.end) || moment(event.start).add(30, 'minutes'); // Default to 30 minutes if no end time
        updatedStart = moment(start).set({
          hour: originalStart.hour(),
          minute: originalStart.minute(),
          second: originalStart.second(),
        }).toDate();
        updatedEnd = moment(end).set({
          hour: originalEnd.hour(),
          minute: originalEnd.minute(),
          second: originalEnd.second(),
        }).toDate();
      }

      const startTime = moment(updatedStart).format('YYYY-MM-DDTHH:mm:ss');
      const endTime = moment(updatedEnd).format('YYYY-MM-DDTHH:mm:ss');
      const payload = {
        appointment_time: startTime,
        end_time: endTime,
        client_id: event.client_id, // Include client_id in the payload for drag-and-drop updates
      };
      console.log('Sending move payload:', payload); // Debug the payload being sent
      const response = await axios.put(`http://localhost:5000/api/schedules/${event.id}`, payload);
      await fetchSchedules(); // Refresh the calendar
      console.log('Appointment moved successfully (drop):', { id: event.id, start: updatedStart, end: updatedEnd, allDay, response, isDragging, selectedEvent, selectedSlot, selectedSlots });
    } catch (err) {
      console.error('Error moving appointment (drop):', err.response ? err.response.data : err.message);
      setError('Failed to move appointment. ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setIsDragging(false); // Reset dragging state when drag is released (drop or cancel)
      console.log('Drag completed, resetting isDragging:', { isDragging: false, selectedEvent, selectedSlot, selectedSlots });
    }
  };

  // Handle resizing appointments to update time slots
  const handleEventResize = async ({ event, start, end, allDay }) => {
    console.log('Attempting to resize appointment:', { event, start, end, allDay, isDragging, selectedEvent, selectedSlot, selectedSlots });
    try {
      // Use the new start and end values by default, but check allDay for row format adjustments
      let updatedStart = start;
      let updatedEnd = end;

      // Only preserve times for allDay events in row format (month view or multi-day events)
      if (allDay && (moment(end).diff(moment(start), 'days') > 1 || moment().isSame(moment(start), 'month'))) {
        const originalStart = moment(event.start);
        const originalEnd = moment(event.end) || moment(event.start).add(30, 'minutes'); // Default to 30 minutes if no end time
        updatedStart = moment(start).set({
          hour: originalStart.hour(),
          minute: originalStart.minute(),
          second: originalStart.second(),
        }).toDate();
        updatedEnd = moment(end).set({
          hour: originalEnd.hour(),
          minute: originalEnd.minute(),
          second: originalEnd.second(),
        }).toDate();
      }

      const startTime = moment(updatedStart).format('YYYY-MM-DDTHH:mm:ss');
      const endTime = moment(updatedEnd).format('YYYY-MM-DDTHH:mm:ss');
      const payload = {
        appointment_time: startTime,
        end_time: endTime,
        client_id: event.client_id, // Include client_id in the payload for resize updates
      };
      console.log('Sending resize payload:', payload); // Debug the payload being sent
      const response = await axios.put(`http://localhost:5000/api/schedules/${event.id}`, payload);
      await fetchSchedules(); // Refresh the calendar
      console.log('Appointment resized successfully:', { id: event.id, start: updatedStart, end: updatedEnd, allDay, response, isDragging, selectedEvent, selectedSlot, selectedSlots });
    } catch (err) {
      console.error('Error resizing appointment:', err.response ? err.response.data : err.message);
      setError('Failed to resize appointment. ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setIsDragging(false); // Reset dragging state when resize is released (resize or cancel)
      console.log('Resize completed, resetting isDragging:', { isDragging: false, selectedEvent, selectedSlot, selectedSlots });
    }
  };

  // Slot highlighting logic (left-click and month view day highlighting, plus drag-over effect)
  const slotPropGetter = (date) => {
    const isHighlighted = highlightedDay && moment(date).isSame(highlightedDay, 'day');
    const isDropTarget = isDragging && selectedSlots.some(slot => moment(date).isSame(slot, 'minute'));

    if (isHighlighted) {
      return {
        style: {
          backgroundColor: '#e6f7ff', // Light blue highlight for selected day in month view
          border: '2px solid #1890ff', // Blue border for visibility
          transition: 'background-color 0.3s ease, border 0.3s ease',
        },
      };
    }
    if (isDropTarget) {
      return {
        style: {
          backgroundColor: '#f0f8ff',
          border: '2px dashed #007bff',
          animation: 'pulse 1.5s infinite',
        },
      };
    }
    if (selectedSlots.some(slot => moment(date).isSame(slot, 'minute'))) {
      return {
        style: {
          backgroundColor: '#808080', // Dark gray for selected time slots
          border: 'none', // No border, matching previous request
          transition: 'background-color 0.3s ease',
        },
      };
    }
    return {};
  };

  // Custom event prop getter to ensure draggable and resizable behavior with animations
  const eventPropGetter = (event) => ({
    style: {
      cursor: 'move',
      touchAction: 'none',
    },
    'data-event-id': event.id, // Add data attribute for right-click detection
  });

  // Handle view change to navigate to highlighted day or week
  const handleViewChange = (view, date) => {
    console.log('View change requested:', { view, date, highlightedDay, selectedEvent, selectedSlot, selectedSlots, isDragging, currentView }); // Debug view change with currentView
    setCurrentView(view); // Update current view state
    if (highlightedDay) {
      const highlightedMoment = moment(highlightedDay);
      if (view === Views.DAY) {
        // Navigate to the highlighted day in day view
        date = highlightedMoment.toDate();
        console.log('Navigating to day view for highlighted day:', date);
      } else if (view === Views.WEEK) {
        // Navigate to the week containing the highlighted day in week view
        date = highlightedMoment.startOf('week').toDate();
        console.log('Navigating to week view for highlighted day:', date);
      }
    }
    return date; // Ensure the date is returned for react-big-calendar to use
  };

  // Handle drag start to apply dragging animation
  const handleDragStart = (event) => {
    console.log('Drag started for event:', { event, isDragging });

    // Apply dragging styles directly to the event element
    const eventElement = document.querySelector(`[data-event-id="${event.id}"]`);
    if (eventElement) {
      eventElement.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.7), 0 0 5px rgba(0, 123, 255, 0.5)';
      eventElement.style.backgroundColor = '#e3f2fd';
      eventElement.style.transform = 'scale(1.05)';
      eventElement.style.zIndex = '1000';
      eventElement.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease, transform 0.3s ease';
      console.log('Applied dragging styles to event element:', eventElement);
    } else {
      console.error('Event element not found for dragging:', event);
    }

    setIsDragging(true);
  };

  // Handle drag end to reset styles and apply drop animation
  const handleDragEnd = () => {
    console.log('Drag ended, resetting styles:', { isDragging });

    // Reset dragging styles and apply drop animation
    const eventElement = document.querySelector(`[data-event-id="${draggingEventId}"]`);
    if (eventElement) {
      eventElement.style.boxShadow = '';
      eventElement.style.backgroundColor = '';
      eventElement.style.transform = '';
      eventElement.style.zIndex = '';
      eventElement.style.animation = 'bounce 0.5s ease-out';
      console.log('Reset dragging styles and applied bounce animation:', eventElement);

      // Remove bounce animation after it completes
      setTimeout(() => {
        eventElement.style.animation = '';
        console.log('Removed bounce animation from event element');
      }, 500);
    } else {
      console.error('Event element not found for drop animation:', draggingEventId);
    }

    setIsDragging(false);
    setDraggingEventId(null);
  };

  // Handle confirmation for deletion
  const confirmDelete = async () => {
    if (selectedEvent && selectedEvent.id) {
      await handleDeleteAppointment();
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 bg-gray-50 min-h-screen" ref={calendarRef}>
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Schedule Appointments</h1>
      {error && <p className="text-red-500 text-center mb-6">{error}</p>}

      {/* Calendar Section */}
      <div className="bg-white p-8 rounded-xl shadow-lg transform transition duration-300 hover:shadow-xl z-10">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Calendar</h2>
        <div onContextMenu={handleContextMenu}>
          <DnDCalendar
            localizer={localizer}
            events={schedules}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            className="rounded-md"
            views={[Views.MONTH, Views.WEEK, Views.DAY]} // Use named constants for clarity
            defaultView={Views.WEEK} // Set default view to week
            onSelectEvent={(event, e) => handleSelectEvent(event, e)} // Handle clicks on events
            onSelectSlot={(slotInfo, e) => handleSelectSlot(slotInfo, e)} // Handle clicks on slots
            onDoubleClickEvent={handleDoubleClickEvent} // Handle double-clicks on events or slots
            selectable={true} // Enable slot selection, controlled by isDragging
            slotPropGetter={slotPropGetter} // Highlight selected slots and days with drag-over effect
            draggableAccessor={(event) => true} // Enable drag-and-drop for all events
            resizable={true} // Enable resizing for all events
            onEventDrop={handleEventDrop} // Handle dragging appointments
            onEventResize={handleEventResize} // Handle resizing appointments
            eventPropGetter={eventPropGetter} // Custom props for draggable/resizable events
            onView={handleViewChange} // Handle view changes to navigate based on highlighted day
            onDragStart={handleDragStart} // Handle drag start to apply dragging animation
            onDragEnd={handleDragEnd} // Handle drag end to reset styles and apply drop animation
          />
        </div>
        <Menu id={SLOT_MENU_ID}>
          {selectedEvent ? (
            <>
              <Item onClick={handleEditAppointment}>Edit Appointment</Item>
              <Item onClick={() => setDeleteConfirmOpen(true)}>Delete Appointment</Item>
            </>
          ) : (
            <Item onClick={handleScheduleClient}>Schedule Client</Item>
          )}
        </Menu>
      </div>

      {/* Schedule Appointment Dialog (Double-Click on Empty Slot) */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} className="relative z-60">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/30 duration-300 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel
            transition
            className="max-w-sm space-y-4 bg-white p-6 duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <DialogTitle className="text-lg font-bold">Schedule Appointment</DialogTitle>
            {selectedSlot && (
              <div className="mb-4 text-left text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Start:</span> {moment(selectedSlot.start).format('MMM D, YYYY h:mm A')}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">End:</span> {selectedSlot.end ? moment(selectedSlot.end).format('MMM D, YYYY h:mm A') : 'N/A'}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Duration:</span> {selectedSlot.end ? moment(selectedSlot.end).diff(moment(selectedSlot.start), 'minutes') : 0} minutes
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Client</label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  placeholder="Appointment details"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setScheduleDialogOpen(false)}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleSubmit}
                  className="px-3 py-1.5 bg-indigo-700 text-white rounded-md hover:bg-indigo-800 text-sm transition duration-300 transform hover:-translate-y-0.5"
                >
                  Confirm
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Edit Appointment Dialog (Double-Click on Appointment or Context Menu) */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} className="relative z-60">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/30 duration-300 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel
            transition
            className="max-w-sm space-y-4 bg-white p-6 duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <DialogTitle className="text-lg font-bold">Edit Appointment</DialogTitle>
            {selectedEvent && (
              <div className="mb-4 text-left text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">Current Start:</span> {moment(selectedEvent.start).format('MMM D, YYYY h:mm A')}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Current End:</span> {selectedEvent.end ? moment(selectedEvent.end).format('MMM D, YYYY h:mm A') : 'N/A'}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Client</label>
                <select
                  value={editForm.client_id || ''} // Use the client_id from the selected event or empty string
                  onChange={(e) => setEditForm({ ...editForm, client_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id} selected={client.id === editForm.client_id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  value={editForm.appointment_time}
                  onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">End Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea
                  placeholder="Appointment details"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-gray-700 text-sm transition duration-200"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditDialogOpen(false)}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-3 py-1.5 bg-indigo-700 text-white rounded-md hover:bg-indigo-800 text-sm transition duration-300 transform hover:-translate-y-0.5"
                >
                  Save
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Transition show={deleteConfirmOpen} as={React.Fragment}>
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} className="relative z-70">
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-black/30 duration-300 ease-out data-[closed]:opacity-0"
          />
          <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
            <DialogPanel
              transition
              className="max-w-sm space-y-4 bg-white p-6 rounded-lg shadow-lg duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
            >
              <DialogTitle className="text-lg font-bold text-gray-900">Confirm Deletion</DialogTitle>
              <p className="text-gray-700">
                Are you sure you want to delete the appointment for "{selectedEvent?.title}" on {moment(selectedEvent?.start).format('MMMM D, YYYY h:mm A')}?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-3 py-1.5 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm transition duration-300 transform hover:-translate-y-0.5"
                >
                  Delete
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Schedule;