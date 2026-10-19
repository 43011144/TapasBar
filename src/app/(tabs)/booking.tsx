import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenHeader from "../../components/ScreenHeader";
import {
  presentBookingNotification,
  useApp,
} from "../../context/AppContext";
import {
  BookingServiceError,
  cancelReservation,
  createReservation,
  getAvailableTables,
  getTables,
  type RestaurantTable,
} from "../../services/bookingService";
import { layout } from "../../constants/theme";
import {
  normalizeEmailAddress,
  parseReservationId,
  validateEmailAddress,
  validatePersonName,
} from "../../utils/validation";

const times = Array.from({ length: 7 }, (_, index) => `${index + 10}:00`);
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FALLBACK_TABLES: RestaurantTable[] = [
  { id: 1, floorNumber: 1, minCapacity: 3, maxCapacity: 4 },
  { id: 2, floorNumber: 1, minCapacity: 3, maxCapacity: 4 },
  { id: 3, floorNumber: 1, minCapacity: 3, maxCapacity: 4 },
  { id: 4, floorNumber: 1, minCapacity: 6, maxCapacity: 8 },
  { id: 5, floorNumber: 1, minCapacity: 2, maxCapacity: 2 },
  { id: 6, floorNumber: 2, minCapacity: 4, maxCapacity: 8 },
  { id: 7, floorNumber: 2, minCapacity: 2, maxCapacity: 2 },
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookingScreen() {
  const {
    colors,
    bookingNotificationsEnabled,
    addNotification,
  } = useApp();
  const styles = createStyles(colors);
  const today = startOfDay(new Date());
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [cancelReservationId, setCancelReservationId] = useState("");
  const [cancelCustomerEmail, setCancelCustomerEmail] = useState("");
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [tableLoadVersion, setTableLoadVersion] = useState(0);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [availabilityState, setAvailabilityState] = useState<{
    key: string;
    tableIds: number[];
    error: string | null;
  } | null>(null);

  const dateText = calendarDate ? toApiDate(calendarDate) : null;
  const availabilityKey =
    dateText && selectedTime
      ? `${dateText}|${selectedTime}|${partySize}|${availabilityVersion}`
      : null;
  const availability =
    availabilityKey && availabilityState?.key === availabilityKey
      ? availabilityState
      : null;
  const availableTableIds = availability?.tableIds ?? [];
  const availabilityError = availability?.error ?? null;
  const isLoadingAvailability = !!availabilityKey && !availability;

  useEffect(() => {
    let active = true;
    getTables()
      .then((result) => {
        if (!active) {
          return;
        }
        setTables(result);
        setServiceError(null);
        if (result.length > 0) {
          setSelectedFloor((floor) =>
            result.some((table) => table.floorNumber === floor)
              ? floor
              : result[0].floorNumber,
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setTables(FALLBACK_TABLES);
          setSelectedFloor(1);
          setServiceError(
            error instanceof Error ? error.message : "Could not load tables.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingTables(false);
        }
      });

    return () => {
      active = false;
    };
  }, [tableLoadVersion]);

  useEffect(() => {
    if (!availabilityKey || !dateText || !selectedTime) {
      return;
    }

    let active = true;
    getAvailableTables(dateText, selectedTime, partySize)
      .then((result) => {
        if (active) {
          setAvailabilityState({
            key: availabilityKey,
            tableIds: result.map((table) => table.id),
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAvailabilityState({
            key: availabilityKey,
            tableIds: [],
            error:
              error instanceof Error
                ? error.message
                : "Could not check table availability.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [availabilityKey, dateText, selectedTime, partySize]);

  const availableTimes = times.filter((time) => {
    if (!calendarDate || toApiDate(calendarDate) !== toApiDate(today)) {
      return true;
    }

    const [hour] = time.split(":").map(Number);
    const now = new Date();
    return hour > now.getHours();
  });

  const monthStart = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const calendarCellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: calendarCellCount }, (_, index) => {
    const day = index - leadingDays + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canShowPreviousMonth = visibleMonth > currentMonthStart;
  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const moveMonth = (offset: number) => {
    setVisibleMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  };

  const floors = [...new Set(tables.map((table) => table.floorNumber))];
  const maxPartySize = tables.reduce(
    (maxCapacity, table) => Math.max(maxCapacity, table.maxCapacity),
    1,
  );
  const floorTables = tables.filter(
    (table) => table.floorNumber === selectedFloor,
  );
  const chosenTable = floorTables.find((table) => table.id === selectedTable);
  const canConfirm =
    !!calendarDate &&
    !!selectedTime &&
    !!chosenTable &&
    partySize <= chosenTable.maxCapacity &&
    !!availability &&
    !availabilityError &&
    availableTableIds.includes(chosenTable.id) &&
    !isSubmitting;

  const retryAvailability = () => {
    setAvailabilityState(null);
    setSelectedTable(null);
    setFeedback(null);
    setAvailabilityVersion((version) => version + 1);
  };

  const confirmBooking = async () => {
    if (!calendarDate) {
      setFeedback({ kind: "error", message: "Choose a date for your booking." });
      return;
    }
    if (!selectedTime) {
      setFeedback({ kind: "error", message: "Choose a time for your booking." });
      return;
    }
    if (!chosenTable) {
      setFeedback({
        kind: "error",
        message: "Select an available table before confirming.",
      });
      return;
    }
    if (isLoadingAvailability || availabilityError || !availability) {
      setFeedback({
        kind: "error",
        message: "Check table availability before confirming this booking.",
      });
      return;
    }
    if (partySize > chosenTable.maxCapacity) {
      setFeedback({
        kind: "error",
        message: `Table ${chosenTable.id} can seat up to ${chosenTable.maxCapacity} people. Choose another table or change your party size.`,
      });
      return;
    }
    if (
      availability &&
      !availabilityError &&
      !availableTableIds.includes(chosenTable.id)
    ) {
      setFeedback({
        kind: "error",
        message:
          "That table is no longer available for this time. Choose another table or time.",
      });
      return;
    }

    const nameError = validatePersonName(customerName);
    if (nameError) {
      setFeedback({ kind: "error", message: nameError });
      return;
    }
    const emailError = validateEmailAddress(customerEmail);
    if (emailError) {
      setFeedback({
        kind: "error",
        message: emailError,
      });
      return;
    }
    const normalizedName = customerName.trim();
    const normalizedEmail = normalizeEmailAddress(customerEmail);

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const reservation = await createReservation({
        tableId: chosenTable.id,
        date: toApiDate(calendarDate),
        time: selectedTime,
        partySize,
        customerName: normalizedName,
        customerEmail: normalizedEmail,
      });
      setCancelReservationId(String(reservation.id));
      setCancelCustomerEmail(normalizedEmail);
      const confirmationMessage = `Reservation #${reservation.id} is confirmed. Table ${chosenTable.id} on Floor ${chosenTable.floorNumber} is booked for ${normalizedName} on ${formatDate(calendarDate)} at ${selectedTime}. Use this reservation ID and the booking email below if you need to cancel.`;
      addNotification({
        title: "Booking confirmed",
        message: confirmationMessage,
      });
      if (bookingNotificationsEnabled) {
        try {
          await presentBookingNotification("Booking confirmed", confirmationMessage);
        } catch (notificationError) {
          console.warn("Could not present booking notification.", notificationError);
        }
      }
      setFeedback({
        kind: "success",
        message: confirmationMessage,
      });
      setSelectedTable(null);
      setAvailabilityVersion((version) => version + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not complete booking.";
      setFeedback({ kind: "error", message });
      if (error instanceof BookingServiceError && error.status === 409) {
        setSelectedTable(null);
        setAvailabilityVersion((version) => version + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelBooking = async () => {
    const reservationId = parseReservationId(cancelReservationId);
    const emailError = validateEmailAddress(cancelCustomerEmail);

    if (reservationId === null) {
      setFeedback({
        kind: "error",
        message: "Enter a reservation ID containing digits only.",
      });
      return;
    }
    if (emailError) {
      setFeedback({
        kind: "error",
        message: "Enter the matching booking email address to cancel this reservation.",
      });
      return;
    }
    const normalizedEmail = normalizeEmailAddress(cancelCustomerEmail);

    setIsCancelling(true);
    setFeedback(null);
    try {
      await cancelReservation({
        reservationId,
        customerEmail: normalizedEmail,
      });
      const cancellationMessage = `Reservation #${reservationId} has been cancelled.`;
      addNotification({
        title: "Booking cancelled",
        message: cancellationMessage,
      });
      if (bookingNotificationsEnabled) {
        try {
          await presentBookingNotification("Booking cancelled", cancellationMessage);
        } catch (notificationError) {
          console.warn("Could not present cancellation notification.", notificationError);
        }
      }
      setFeedback({
        kind: "success",
        message: cancellationMessage,
      });
      setCancelReservationId("");
      setCancelCustomerEmail("");
      setAvailabilityVersion((version) => version + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not cancel the booking.";
      setFeedback({ kind: "error", message });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Book a Table"
        subtitle="The Tapas Pub & Grill · Die Bult, Potchefstroom"
      />

      <View style={styles.formContainer}>
        <Text style={styles.serviceHint}>
          Choose a date, time, floor, and your preferred table. We take
          reservations every day from 10:00 to 16:00.
        </Text>

        {serviceError && (
          <View style={styles.noticeError}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {serviceError}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setIsLoadingTables(true);
                setServiceError(null);
                setTableLoadVersion((version) => version + 1);
              }}
            >
              <Text style={styles.retryText}>Retry loading tables</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Choose a date</Text>
        <View style={styles.calendar}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              accessibilityState={{ disabled: !canShowPreviousMonth }}
              disabled={!canShowPreviousMonth}
              onPress={() => moveMonth(-1)}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canShowPreviousMonth ? colors.text : colors.mutedLight}
              />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => moveMonth(1)}
              style={styles.monthButton}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarGrid}>
            {weekdays.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
            {calendarCells.map((day, index) => {
              if (day === null) {
                return (
                  <View key={`empty-${index}`} style={styles.dayCell} />
                );
              }

              const date = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth(),
                day,
              );
              const isPast = date < today;
              const isSelected =
                calendarDate?.getFullYear() === date.getFullYear() &&
                calendarDate?.getMonth() === date.getMonth() &&
                calendarDate?.getDate() === date.getDate();

              return (
                <TouchableOpacity
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={formatDate(date)}
                  accessibilityState={{
                    disabled: isPast,
                    selected: isSelected,
                  }}
                  disabled={isPast}
                  onPress={() => {
                    setCalendarDate(date);
                    setSelectedTime(null);
                    setSelectedTable(null);
                    setFeedback(null);
                  }}
                  style={[
                    styles.dayCell,
                    isToday(date) && !isSelected && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isPast && styles.dayTextPast,
                      isToday(date) && !isSelected && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.calendarHint}>
            Reservations are available every day, Monday through Sunday.
          </Text>
        </View>

        <Text style={styles.label}>Choose a time</Text>
        {!calendarDate ? (
          <Text style={styles.helperText}>
            Select a date to see available times.
          </Text>
        ) : availableTimes.length === 0 ? (
          <Text style={styles.helperText}>
            No remaining time slots are available today.
          </Text>
        ) : (
          <View style={styles.optionsRow}>
            {availableTimes.map((time) => (
              <TouchableOpacity
                key={time}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTime === time }}
                style={[
                  styles.optionButton,
                  selectedTime === time && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setSelectedTime(time);
                  setSelectedTable(null);
                  setFeedback(null);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedTime === time && styles.optionTextActive,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {calendarDate &&
          toApiDate(calendarDate) === toApiDate(today) &&
          availableTimes.length < times.length && (
            <Text style={styles.helperText}>
              Past time slots are hidden for today. Choose another date to see
              all booking times from 10:00 to 16:00.
            </Text>
          )}

        <Text style={styles.label}>Booking contact</Text>
        <Text style={styles.helperText}>
          Enter the name and email address for this reservation.
        </Text>
        <TextInput
          accessibilityLabel="Name for the booking"
          autoCapitalize="words"
          autoComplete="name"
          maxLength={120}
          onChangeText={(value) => {
            setCustomerName(value);
            setFeedback(null);
          }}
          placeholder="Full name"
          placeholderTextColor={colors.mutedLight}
          style={styles.input}
          value={customerName}
        />
        <TextInput
          accessibilityLabel="Booking contact email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          maxLength={254}
          onChangeText={(value) => {
            setCustomerEmail(value);
            setFeedback(null);
          }}
          placeholder="Email address"
          placeholderTextColor={colors.mutedLight}
          style={[styles.input, styles.emailInput]}
          value={customerEmail}
        />
        <Text style={styles.label}>Number of people</Text>
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remove one person"
            disabled={partySize <= 1}
            style={[
              styles.stepperButton,
              partySize <= 1 && styles.buttonDisabled,
            ]}
            onPress={() => {
              setPartySize((size) => Math.max(1, size - 1));
              setSelectedTable(null);
              setFeedback(null);
            }}
          >
            <Ionicons
              name="remove"
              size={24}
              color={colors.textOnDark}
            />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{partySize}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add one person"
            disabled={partySize >= maxPartySize}
            style={[
              styles.stepperButton,
              partySize >= maxPartySize && styles.buttonDisabled,
            ]}
            onPress={() => {
              setPartySize((size) => Math.min(maxPartySize, size + 1));
              setSelectedTable(null);
              setFeedback(null);
            }}
          >
            <Ionicons name="add" size={24} color={colors.textOnDark} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Choose a floor</Text>
        {isLoadingTables ? (
          <Text style={styles.helperText}>Loading floors…</Text>
        ) : (
          <View style={styles.optionsRow}>
            {floors.map((floor) => (
              <TouchableOpacity
                key={floor}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedFloor === floor }}
                style={[
                  styles.optionButton,
                  selectedFloor === floor && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setSelectedFloor(floor);
                  setSelectedTable(null);
                  setFeedback(null);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedFloor === floor && styles.optionTextActive,
                  ]}
                >
                  Floor {floor}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.tableHeading}>
          <Text style={styles.label}>Choose your table</Text>
          <Text style={styles.tableLegend}>Tap a table to select it</Text>
        </View>
        {isLoadingTables ? (
          <Text style={styles.helperText}>Loading tables…</Text>
        ) : !calendarDate || !selectedTime ? (
          <Text style={styles.helperText}>
            Choose a valid date and time to see available tables.
          </Text>
        ) : isLoadingAvailability ? (
          <Text style={styles.helperText}>Checking table availability…</Text>
        ) : availabilityError ? (
          <View style={styles.noticeError}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {availabilityError}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={retryAvailability}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry availability check</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.tableList}>
          {floorTables.map((table) => {
            const fitsParty = partySize <= table.maxCapacity;
            const isAvailable = availableTableIds.includes(table.id);
            const isSelected = selectedTable === table.id;
            const isSelectable =
              !!calendarDate &&
              !!selectedTime &&
              !isLoadingTables &&
              !!availability &&
              !availabilityError &&
              isAvailable &&
              fitsParty;
            const isHovered = hoveredTable === table.id;
            const availabilityLabel = availabilityError
              ? "availability unknown"
              : isAvailable
                ? fitsParty
                  ? "available"
                  : `fits up to ${table.maxCapacity} people`
                : calendarDate && selectedTime && !isLoadingAvailability
                  ? "unavailable"
                  : "not checked";

            return (
              <Pressable
                key={table.id}
                accessibilityRole="button"
                accessibilityLabel={`Table ${table.id}, Floor ${table.floorNumber}, ${table.minCapacity} to ${table.maxCapacity} seats, ${availabilityLabel}`}
                accessibilityState={{
                  disabled: !isSelectable,
                  selected: isSelected,
                }}
                disabled={!isSelectable}
                onHoverIn={() => setHoveredTable(table.id)}
                onHoverOut={() => setHoveredTable(null)}
                onPress={() => {
                  setSelectedTable(table.id);
                  setFeedback(null);
                }}
                style={[
                  styles.tableButton,
                  isHovered && isSelectable && styles.tableButtonHovered,
                  isSelected && styles.tableButtonActive,
                  !isSelectable && styles.tableButtonDisabled,
                ]}
              >
                <View style={styles.tableDetails}>
                  <Text
                    style={[
                      styles.tableName,
                      isSelected && styles.optionTextActive,
                    ]}
                  >
                    Table {table.id}
                  </Text>
                  <Text
                    style={[
                      styles.tableCapacity,
                      isSelected && styles.tableCapacityActive,
                    ]}
                  >
                    Floor {table.floorNumber} · {table.minCapacity}–
                    {table.maxCapacity} seats
                  </Text>
                  <Text
                    style={[
                      styles.tableStatus,
                      isAvailable &&
                        isSelectable &&
                        styles.tableStatusAvailable,
                      !isAvailable &&
                        !availabilityError &&
                        !!calendarDate &&
                        !!selectedTime &&
                        !isLoadingAvailability &&
                        styles.tableStatusUnavailable,
                      isSelected && styles.tableCapacityActive,
                    ]}
                  >
                    {!calendarDate || !selectedTime
                      ? "Choose a date and time"
                      : isLoadingAvailability
                        ? "Checking availability…"
                        : availabilityError
                          ? "Availability could not be checked"
                          : !fitsParty
                            ? `For ${table.minCapacity}–${table.maxCapacity} people`
                            : isAvailable
                              ? "Available · Select this table"
                              : "Booked for this time"}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.textOnDark}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {floorTables.length === 0 && !isLoadingTables && !serviceError && (
          <Text style={styles.helperText}>No tables are set up on this floor.</Text>
        )}
        {!isLoadingTables &&
          calendarDate &&
          selectedTime &&
          !isLoadingAvailability &&
          !availabilityError &&
          availableTableIds.length === 0 && (
            <Text style={styles.helperText}>
              No tables are available for this date, time, and party size. Try
              another time or date.
            </Text>
          )}

        {calendarDate && selectedTime && chosenTable && (
          <Text style={styles.bookingSummary}>
            Your booking: {formatDate(calendarDate)} at {selectedTime} ·{" "}
            {partySize} {partySize === 1 ? "person" : "people"} · Table{" "}
            {chosenTable.id}
          </Text>
        )}

        {feedback && (
          <View
            accessibilityRole={feedback.kind === "error" ? "alert" : undefined}
            style={[
              styles.feedback,
              feedback.kind === "success"
                ? styles.feedbackSuccess
                : styles.feedbackError,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.kind === "success"
                  ? styles.feedbackSuccessText
                  : styles.feedbackErrorText,
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Cancel a reservation</Text>
        <Text style={styles.helperText}>
          Need to cancel a booking? Enter the reservation ID and the booking email.
        </Text>
        <TextInput
          accessibilityLabel="Reservation ID to cancel"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          onChangeText={(value) => {
            setCancelReservationId(value.replace(/\D/g, "").slice(0, 19));
            setFeedback(null);
          }}
          placeholder="Reservation ID"
          placeholderTextColor={colors.mutedLight}
          maxLength={19}
          style={styles.input}
          value={cancelReservationId}
        />
        <TextInput
          accessibilityLabel="Email for reservation cancellation"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          maxLength={254}
          onChangeText={(value) => {
            setCancelCustomerEmail(value);
            setFeedback(null);
          }}
          placeholder="Booking email"
          placeholderTextColor={colors.mutedLight}
          style={[styles.input, styles.emailInput]}
          value={cancelCustomerEmail}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: isCancelling }}
          disabled={isCancelling}
          style={[
            styles.secondaryButton,
            isCancelling && styles.confirmButtonDisabled,
          ]}
          onPress={cancelBooking}
        >
          <Text style={styles.secondaryButtonText}>
            {isCancelling ? "Cancelling…" : "Cancel Reservation"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm }}
          disabled={!canConfirm}
          style={[
            styles.confirmButton,
            !canConfirm && styles.confirmButtonDisabled,
          ]}
          onPress={confirmBooking}
        >
          <Text style={styles.confirmButtonText}>
            {isSubmitting ? "Booking…" : "Confirm Booking"}
          </Text>
        </TouchableOpacity>
        {!canConfirm && (
          <Text style={styles.confirmHint}>
            {!calendarDate
              ? "Choose a date to get started."
              : !selectedTime
                ? "Choose a time to see available tables."
                : isLoadingAvailability
                  ? "Please wait while we check table availability."
                  : availabilityError
                    ? "Retry the availability check before booking."
                    : !chosenTable
                      ? "Select an available table to continue."
                      : "Your booking is being submitted."}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useApp>["colors"]) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: layout.pageBottomPadding },
  formContainer: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: layout.horizontalPadding,
    paddingBottom: 20,
  },
  serviceHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  noticeError: {
    padding: 12,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: colors.errorBackground,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  retryText: {
    color: colors.secondary,
    fontWeight: "700",
    marginTop: 8,
  },
  retryButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
    marginTop: 20,
  },
  calendar: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.28%",
    flexShrink: 0,
    textAlign: "center",
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 8,
  },
  dayCell: {
    width: "14.28%",
    minHeight: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  dayCellToday: { borderWidth: 1, borderColor: colors.accent },
  dayCellSelected: { backgroundColor: colors.accent },
  dayText: { color: colors.text, fontSize: 14 },
  dayTextPast: { color: "#c6c6c6" },
  dayTextToday: { color: colors.accent, fontWeight: "700" },
  dayTextSelected: { color: colors.textOnDark, fontWeight: "700" },
  calendarHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: "center",
  },
  helperText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  emailInput: { marginTop: 10 },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  optionButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  optionButtonActive: { backgroundColor: colors.accent },
  optionText: { fontSize: 14, fontWeight: "600", color: colors.text },
  optionTextActive: { color: colors.textOnDark },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperButton: {
    backgroundColor: colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.45 },
  stepperValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.text,
    marginHorizontal: 30,
  },
  tableHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  tableLegend: {
    color: colors.mutedLight,
    fontSize: 12,
    marginTop: 20,
  },
  tableList: { gap: 10 },
  tableButton: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableButtonHovered: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondaryTint,
  },
  tableButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  tableButtonDisabled: { opacity: 0.48 },
  tableDetails: { flex: 1 },
  tableName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  tableCapacity: { color: colors.muted, fontSize: 13, marginTop: 3 },
  tableStatus: { color: colors.mutedLight, fontSize: 12, marginTop: 5 },
  tableStatusAvailable: { color: colors.success, fontWeight: "600" },
  tableStatusUnavailable: {
    color: colors.textUnavailable,
    fontWeight: "600",
  },
  tableCapacityActive: { color: colors.secondaryLight },
  bookingSummary: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 16,
  },
  feedback: {
    padding: 12,
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: colors.successBackground,
    borderColor: colors.borderSuccess,
  },
  feedbackError: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.borderError,
  },
  feedbackText: { fontSize: 14, lineHeight: 20 },
  feedbackSuccessText: { color: colors.success },
  feedbackErrorText: { color: colors.error },
  secondaryButton: {
    backgroundColor: colors.surface,
    minHeight: 52,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: colors.accent,
    minHeight: 56,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: {
    color: colors.textOnDark,
    fontSize: 18,
    fontWeight: "bold",
  },
  confirmHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  });
}
