using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentTypePatientConfirmationRecurrence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AppointmentType",
                table: "Appointments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "IN_PERSON");

            migrationBuilder.AddColumn<string>(
                name: "PatientConfirmation",
                table: "Appointments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "PENDING");

            migrationBuilder.AddColumn<Guid>(
                name: "RecurrenceGroupId",
                table: "Appointments",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppointmentType",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PatientConfirmation",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "RecurrenceGroupId",
                table: "Appointments");
        }
    }
}
