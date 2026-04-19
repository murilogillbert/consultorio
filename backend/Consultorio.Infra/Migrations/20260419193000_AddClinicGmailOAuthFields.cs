using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    public partial class AddClinicGmailOAuthFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GmailAccessToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GmailClientId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GmailClientSecret",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GmailConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "GmailRefreshToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GmailTokenExpiresAt",
                table: "Clinics",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GmailAccessToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailClientId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailClientSecret",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailConnected",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailRefreshToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailTokenExpiresAt",
                table: "Clinics");
        }
    }
}
