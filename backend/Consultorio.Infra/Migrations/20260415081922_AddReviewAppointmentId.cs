using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewAppointmentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AppointmentId",
                table: "ProfessionalReviews",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalReviews_AppointmentId",
                table: "ProfessionalReviews",
                column: "AppointmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProfessionalReviews_Appointments_AppointmentId",
                table: "ProfessionalReviews",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProfessionalReviews_Appointments_AppointmentId",
                table: "ProfessionalReviews");

            migrationBuilder.DropIndex(
                name: "IX_ProfessionalReviews_AppointmentId",
                table: "ProfessionalReviews");

            migrationBuilder.DropColumn(
                name: "AppointmentId",
                table: "ProfessionalReviews");
        }
    }
}
