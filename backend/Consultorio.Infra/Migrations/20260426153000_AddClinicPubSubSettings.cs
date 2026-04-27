using System;
using Consultorio.Infra.Context;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260426153000_AddClinicPubSubSettings")]
    public partial class AddClinicPubSubSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PubSubProjectId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubSubTopicName",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PubSubServiceAccount",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PubSubConnected",
                table: "Clinics",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PubSubWatchExpiresAt",
                table: "Clinics",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GmailWatchHistoryId",
                table: "Clinics",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PubSubProjectId",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubSubTopicName",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubSubServiceAccount",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubSubConnected",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "PubSubWatchExpiresAt",
                table: "Clinics");

            migrationBuilder.DropColumn(
                name: "GmailWatchHistoryId",
                table: "Clinics");
        }
    }
}
