using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    public partial class AddWhatsAppIntegrationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WaAccessToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WaAppSecret",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WaConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WaPhoneNumberId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WaVerifyToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WaWabaId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalMessageId",
                table: "PatientMessages",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalProvider",
                table: "PatientMessages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalStatus",
                table: "PatientMessages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExternalTimestamp",
                table: "PatientMessages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientMessages_ExternalMessageId",
                table: "PatientMessages",
                column: "ExternalMessageId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PatientMessages_ExternalMessageId",
                table: "PatientMessages");

            migrationBuilder.DropColumn(
                name: "WaAccessToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "WaAppSecret",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "WaConnected",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "WaPhoneNumberId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "WaVerifyToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "WaWabaId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "ExternalMessageId",
                table: "PatientMessages");

            migrationBuilder.DropColumn(
                name: "ExternalProvider",
                table: "PatientMessages");

            migrationBuilder.DropColumn(
                name: "ExternalStatus",
                table: "PatientMessages");

            migrationBuilder.DropColumn(
                name: "ExternalTimestamp",
                table: "PatientMessages");
        }
    }
}
