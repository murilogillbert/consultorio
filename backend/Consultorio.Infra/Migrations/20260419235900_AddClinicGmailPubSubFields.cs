using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    public partial class AddClinicGmailPubSubFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GmailAddress",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GmailWatchHistoryId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubProjectId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubPushEndpoint",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubServiceAccount",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubSubscriptionName",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubTopicName",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubsubVerificationToken",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PubsubWatchExpiresAt",
                table: "Clinics",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GmailAddress",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailWatchHistoryId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubProjectId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubPushEndpoint",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubServiceAccount",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubSubscriptionName",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubTopicName",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubVerificationToken",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubsubWatchExpiresAt",
                table: "Clinics");
        }
    }
}
