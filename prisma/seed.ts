/**
 * Seeds a demonstrable dataset: three roles, a spread of events across every
 * status, registrations, and some attendance records so the reports page has
 * real numbers in it.
 *
 * Run with:  npm run db:seed
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const envFile = path.join(process.cwd(), ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const DEMO_PASSWORD = "password123";

function ticketCode() {
  const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `CES-${raw.slice(0, 8)}-${raw.slice(8)}`;
}

function at(dayOffset: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.attendance.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating users…");
  await prisma.user.create({
    data: {
      name: "Priya Nair",
      email: "admin@campus.edu",
      password,
      role: "ADMIN",
      department: "Administration",
    },
  });

  const organizers = await Promise.all(
    [
      { name: "Rahul Mehta", email: "organizer@campus.edu", department: "Computer Science" },
      { name: "Sneha Iyer", email: "cultural@campus.edu", department: "Student Affairs" },
    ].map((data) =>
      prisma.user.create({ data: { ...data, password, role: "ORGANIZER" } }),
    ),
  );

  const students = await Promise.all(
    [
      { name: "Aarav Sharma", enrollmentNo: "21CS1011", department: "Computer Science" },
      { name: "Diya Patel", enrollmentNo: "21EC1042", department: "Electronics" },
      { name: "Kabir Singh", enrollmentNo: "22ME2087", department: "Mechanical" },
      { name: "Meera Krishnan", enrollmentNo: "21CS1133", department: "Computer Science" },
      { name: "Rohan Das", enrollmentNo: "22IT2210", department: "Information Technology" },
      { name: "Ananya Rao", enrollmentNo: "21CV1309", department: "Civil" },
    ].map((data, index) =>
      prisma.user.create({
        data: {
          ...data,
          email: index === 0 ? "student@campus.edu" : `student${index + 1}@campus.edu`,
          password,
          role: "STUDENT",
        },
      }),
    ),
  );

  console.log("Creating events…");
  const eventSpecs = [
    {
      title: "Annual Hackathon 2026",
      description:
        "A 24-hour team hackathon on open problem statements in campus logistics and accessibility. Teams of up to four; laptops and chargers required. Mentors from the CS department are available through the night.",
      category: "TECHNICAL",
      venue: "Innovation Lab, Block 3",
      startsAt: at(7, 9),
      endsAt: at(8, 9),
      capacity: 60,
      status: "PUBLISHED",
      organizerId: organizers[0].id,
    },
    {
      title: "Workshop: Building REST APIs",
      description:
        "Hands-on session covering HTTP methods, status codes, authentication and testing. Bring a laptop with Node.js installed. Participants build and deploy a small API by the end of the session.",
      category: "WORKSHOP",
      venue: "Seminar Hall B",
      startsAt: at(3, 14),
      endsAt: at(3, 17),
      capacity: 40,
      status: "PUBLISHED",
      organizerId: organizers[0].id,
    },
    {
      title: "Spandan Cultural Night",
      description:
        "The annual cultural evening — dance, music and drama performances from every department, followed by the prize distribution ceremony. Open to all students and faculty.",
      category: "CULTURAL",
      venue: "Open Air Theatre",
      startsAt: at(12, 18),
      endsAt: at(12, 22),
      capacity: 300,
      status: "PUBLISHED",
      organizerId: organizers[1].id,
    },
    {
      title: "Inter-Department Football Cup",
      description:
        "Knockout football tournament between departments. Register as a squad representative; squad lists must be submitted at the ground one hour before kickoff.",
      category: "SPORTS",
      venue: "Main Ground",
      startsAt: at(20, 8),
      endsAt: at(20, 17),
      capacity: 120,
      status: "PUBLISHED",
      organizerId: organizers[1].id,
    },
    {
      title: "Seminar: Careers in Semiconductor Design",
      description:
        "An industry seminar on VLSI and chip design career paths, with an alumni panel and a question-and-answer session. Final-year and pre-final-year students are encouraged to attend.",
      category: "SEMINAR",
      venue: "Auditorium",
      startsAt: at(-10, 11),
      endsAt: at(-10, 13),
      capacity: 150,
      status: "PUBLISHED",
      organizerId: organizers[0].id,
    },
    {
      title: "Robotics Expo (planning)",
      description:
        "Draft listing for the robotics exhibition. Venue, judging criteria and sponsor list are still being confirmed, so this event is not yet visible to students.",
      category: "TECHNICAL",
      venue: "To be confirmed",
      startsAt: at(35, 10),
      endsAt: at(35, 16),
      capacity: 80,
      status: "DRAFT",
      organizerId: organizers[0].id,
    },
  ];

  const events = [];
  for (const spec of eventSpecs) {
    events.push(await prisma.event.create({ data: spec }));
  }

  console.log("Creating registrations and attendance…");
  // Registration spread: everyone for the past seminar (so it has attendance),
  // partial for upcoming events.
  const plan: { event: typeof events[number]; students: typeof students; checkIn: number }[] = [
    { event: events[0], students: students.slice(0, 4), checkIn: 0 },
    { event: events[1], students: students.slice(1, 5), checkIn: 0 },
    { event: events[2], students: students, checkIn: 0 },
    { event: events[3], students: students.slice(2, 5), checkIn: 0 },
    { event: events[4], students: students, checkIn: 5 },
  ];

  for (const entry of plan) {
    let index = 0;
    for (const student of entry.students) {
      const registration = await prisma.registration.create({
        data: {
          userId: student.id,
          eventId: entry.event.id,
          ticketCode: ticketCode(),
          status: "CONFIRMED",
        },
      });

      await prisma.notification.create({
        data: {
          userId: student.id,
          type: "CONFIRMATION",
          title: `Registration confirmed: ${entry.event.title}`,
          body: `Your ticket ${registration.ticketCode} is valid for ${entry.event.venue}. Show the QR code at the entrance.`,
          readAt: index % 2 === 0 ? new Date() : null,
        },
      });

      if (index < entry.checkIn) {
        await prisma.attendance.create({
          data: {
            registrationId: registration.id,
            checkedInById: entry.event.organizerId,
            checkedInAt: new Date(entry.event.startsAt.getTime() + 10 * 60 * 1000),
          },
        });
      }

      index += 1;
    }
  }

  // One cancelled registration, so the reports show a non-zero cancelled count.
  const cancelled = await prisma.registration.findFirst({
    where: { eventId: events[3].id },
  });
  if (cancelled) {
    await prisma.registration.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED" },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    events: await prisma.event.count(),
    registrations: await prisma.registration.count(),
    attendance: await prisma.attendance.count(),
  };

  console.log("\nSeed complete:", counts);
  console.log(`
Demo accounts — password for all: ${DEMO_PASSWORD}

  Administrator  admin@campus.edu
  Organizer      organizer@campus.edu
  Organizer      cultural@campus.edu
  Student        student@campus.edu   (student2@… through student6@… also exist)
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
