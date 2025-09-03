import { google } from "googleapis";
import credentials from "@/primoaire-fbadf23f0b75.json";
import SheetProject from "@/models/SheetProject";
import { dbConnect } from "@/lib/mongo";
import JobType from "@/models/JobType";

export async function POST() {
  await dbConnect();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Spreadsheet ID not configured.",
      }),
      { status: 500 }
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetName = sheetMeta.data.sheets?.[0].properties?.title;

    if (!sheetName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No sheets found in spreadsheet.",
        }),
        { status: 400 }
      );
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const rows = response.data.values || [];

    if (rows.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Not enough data in the sheet to extract job details (expected at least 3 rows).",
        }),
        { status: 400 }
      );
    }

    const jobsToImport = rows.slice(2);

    const importedJobs = [];

    for (const jobData of jobsToImport) {
      const getValue = (value: string | undefined) =>
        value === undefined || value === "" ? null : value;

      const jobNoValue = getValue(jobData[0]);
      const jobNameValue = getValue(jobData[1]);
      const jobTypeValue = getValue(jobData[2]);
      const jobTypes = await JobType.find({ name: jobTypeValue })

      if (!jobNoValue) {
        console.log("Skipping empty row (Job# is missing):", jobData);
        continue;
      }

      const sheetProjectData = {
        jobNo: jobNoValue as string | null,
        jobName: jobNameValue as string | null,
        jobType: getValue(jobData[2]) as string | null,
        truckLoadDate: getValue(jobData[3]) as string | null,
        weeksToBuildInWkshop: Number(getValue(jobData[4]) || 0),
        status: getValue(jobData[5]) as string | null,
        probability: getValue(jobData[6]) as string | null,
        cnc: getValue(jobData[7]) as string | null,
        build: getValue(jobData[8]) as string | null,
        paint: getValue(jobData[9]) as string | null,
        av: getValue(jobData[10]) as string | null,
        packAndLoad: getValue(jobData[11]) as string | null,
        tradeOnsite: getValue(jobData[12]) as string | null,
        onsiteWeeks: Number(getValue(jobData[13]) || 0),
        installDeadline: getValue(jobData[14]) as string | null,
        hrsEstOnly: getValue(jobData[15]) as string | null,
        pm: getValue(jobData[16]) as string | null,
        notes: getValue(jobData[17]) as string | null,
      };

      console.log("Importing job:", sheetProjectData);
      const newSheetProject = new SheetProject(sheetProjectData);
      await newSheetProject.save();
      importedJobs.push(newSheetProject);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${importedJobs.length} job(s) successfully imported and saved.`,
        data: importedJobs,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("The API returned an error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "An unknown error occurred.",
      }),
      { status: 500 }
    );
  }
}
