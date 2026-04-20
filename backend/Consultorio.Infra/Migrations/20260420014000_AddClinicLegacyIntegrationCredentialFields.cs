using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    public partial class AddClinicLegacyIntegrationCredentialFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IgAccessToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IgAccountId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IgConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "IgPageId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IgTokenExpiresAt",
                table: "Clinics",
                type: "datetime2",
                nullable: true);

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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IgAccessToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "IgAccountId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "IgConnected",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "IgPageId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "IgTokenExpiresAt",
                table: "Clinics");

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
        }
    }
}
